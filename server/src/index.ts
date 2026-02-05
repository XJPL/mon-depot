import express from "express";
import { fetchPennylane } from "./pennylane.js";
import { type InvoiceKind, listInvoicesByMonth } from "./invoiceStore.js";
import { buildInvoiceSummary } from "./invoiceSummary.js";
import {
  parseDateOnly,
  parseLimit,
  parseMonth,
  syncPennylane,
} from "./syncService.js";
import { startPennylaneScheduler } from "./scheduler.js";

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "API en ligne" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const sendPennylaneResponse = async (
  res: express.Response,
  response: Awaited<ReturnType<typeof fetch>>,
) => {
  if (response.status === 204) {
    res.status(204).end();
    return;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  if (contentType.includes("application/json") && raw) {
    try {
      res.status(response.status).json(JSON.parse(raw));
      return;
    } catch {
      // Fall through to plain text.
    }
  }

  res.status(response.status).send(raw);
};

const getQueryString = (value: unknown) => {
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string") {
      return first;
    }
    if (typeof first === "number" || typeof first === "boolean") {
      return String(first);
    }
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
};

const parseInvoiceKind = (value?: string) => {
  if (!value || value === "all") {
    return "all";
  }
  if (value === "customer" || value === "supplier") {
    return value;
  }
  return null;
};

const parseBoolean = (value?: string) => {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return null;
};

const handlePennylaneList = async (
  req: express.Request,
  res: express.Response,
  path: string,
) => {
  try {
    const response = await fetchPennylane(
      path,
      req.query as Record<string, unknown>,
    );
    await sendPennylaneResponse(res, response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    res.status(500).json({ error: message });
  }
};

app.get("/api/pennylane/customer-invoices", (req, res) => {
  handlePennylaneList(req, res, "/customer_invoices");
});

app.get("/api/pennylane/supplier-invoices", (req, res) => {
  handlePennylaneList(req, res, "/supplier_invoices");
});

app.post("/api/pennylane/sync", async (req, res) => {
  const typeValue = getQueryString(req.query.type ?? req.body?.type);
  const kind = parseInvoiceKind(typeValue);
  if (!kind) {
    res.status(400).json({ error: "type invalide" });
    return;
  }

  const monthValue = getQueryString(req.query.month ?? req.body?.month);
  const parsedMonth = parseMonth(monthValue);
  if (monthValue && !parsedMonth) {
    res.status(400).json({ error: "month invalide (YYYY-MM)" });
    return;
  }

  const limitValue = getQueryString(req.query.limit ?? req.body?.limit);
  const limit = parseLimit(limitValue);
  if (!limit) {
    res.status(400).json({ error: "limit invalide (1-100)" });
    return;
  }

  const incrementalValue = getQueryString(
    req.query.incremental ?? req.body?.incremental,
  );
  const incremental =
    incrementalValue === undefined ? false : parseBoolean(incrementalValue);
  if (incrementalValue !== undefined && incremental === null) {
    res.status(400).json({ error: "incremental invalide" });
    return;
  }

  const sinceValue = getQueryString(req.query.since ?? req.body?.since);
  const since = sinceValue ? parseDateOnly(sinceValue) : null;
  if (sinceValue && !since) {
    res.status(400).json({ error: "since invalide (YYYY-MM-DD)" });
    return;
  }

  try {
    const result = await syncPennylane({
      type: kind,
      month: parsedMonth?.value,
      limit,
      incremental: incremental ?? false,
      since: since ?? undefined,
    });

    res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    res.status(500).json({ error: message });
  }
});

app.get("/api/invoices", (req, res) => {
  const monthValue = getQueryString(req.query.month);
  if (!monthValue) {
    res.status(400).json({ error: "month requis (YYYY-MM)" });
    return;
  }

  const parsedMonth = parseMonth(monthValue);
  if (!parsedMonth) {
    res.status(400).json({ error: "month invalide (YYYY-MM)" });
    return;
  }

  const typeValue = getQueryString(req.query.type);
  const kind = parseInvoiceKind(typeValue);
  if (kind === null) {
    res.status(400).json({ error: "type invalide" });
    return;
  }

  const items = listInvoicesByMonth(
    parsedMonth.value,
    kind === "all" ? undefined : kind,
  );

  res.json({
    month: parsedMonth.value,
    count: items.length,
    items,
  });
});

app.get("/api/invoices/summary", (req, res) => {
  const monthValue = getQueryString(req.query.month);
  if (!monthValue) {
    res.status(400).json({ error: "month requis (YYYY-MM)" });
    return;
  }

  const parsedMonth = parseMonth(monthValue);
  if (!parsedMonth) {
    res.status(400).json({ error: "month invalide (YYYY-MM)" });
    return;
  }

  const typeValue = getQueryString(req.query.type);
  const kind = parseInvoiceKind(typeValue);
  if (kind === null) {
    res.status(400).json({ error: "type invalide" });
    return;
  }

  const items = listInvoicesByMonth(
    parsedMonth.value,
    kind === "all" ? undefined : kind,
  );
  const summary = items.map(buildInvoiceSummary);

  res.json({
    month: parsedMonth.value,
    count: summary.length,
    items: summary,
  });
});

startPennylaneScheduler();

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
