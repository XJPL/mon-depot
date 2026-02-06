import crypto from "node:crypto";
import express from "express";
import { fetchPennylane } from "./pennylane.js";
import { listInvoicesByMonth } from "./invoiceStore.js";
import { buildInvoiceSummary } from "./invoiceSummary.js";
import { invoicesQuerySchema, syncQuerySchema } from "./apiContracts.js";
import { formatZodError, sendError } from "./http.js";
import { syncPennylane } from "./syncService.js";
import { startPennylaneScheduler } from "./scheduler.js";

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json());
app.use((_req, res, next) => {
  const requestId = crypto.randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

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

const handlePennylaneList = async (
  req: express.Request,
  res: express.Response,
  path: string,
) => {
  try {
    const headerToken = req.get("x-pennylane-token");
    const authHeader = req.get("authorization");
    const bearerToken =
      authHeader && authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7)
        : undefined;
    const tokenOverride = headerToken ?? bearerToken ?? undefined;

    const response = await fetchPennylane(
      path,
      req.query as Record<string, unknown>,
      tokenOverride ? { token: tokenOverride } : undefined,
    );
    await sendPennylaneResponse(res, response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    sendError(res, 500, "PENNYLANE_PROXY_ERROR", message);
  }
};

app.get("/api/pennylane/customer-invoices", (req, res) => {
  handlePennylaneList(req, res, "/customer_invoices");
});

app.get("/api/pennylane/supplier-invoices", (req, res) => {
  handlePennylaneList(req, res, "/supplier_invoices");
});

app.post("/api/pennylane/sync", async (req, res) => {
  const input = {
    type: getQueryString(req.query.type ?? req.body?.type),
    month: getQueryString(req.query.month ?? req.body?.month),
    limit: getQueryString(req.query.limit ?? req.body?.limit),
    incremental: getQueryString(req.query.incremental ?? req.body?.incremental),
    since: getQueryString(req.query.since ?? req.body?.since),
  };

  const parsed = syncQuerySchema.safeParse(input);
  if (!parsed.success) {
    sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Parametres invalides",
      formatZodError(parsed.error),
    );
    return;
  }

  const { type, month, limit, incremental, since } = parsed.data;

  try {
    const result = await syncPennylane({
      type,
      month,
      limit,
      incremental: incremental ?? false,
      since: since ?? undefined,
    });

    res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    sendError(res, 500, "SYNC_ERROR", message);
  }
});

app.get("/api/invoices", (req, res) => {
  const input = {
    month: getQueryString(req.query.month),
    type: getQueryString(req.query.type),
  };

  const parsed = invoicesQuerySchema.safeParse(input);
  if (!parsed.success) {
    sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Parametres invalides",
      formatZodError(parsed.error),
    );
    return;
  }

  const items = listInvoicesByMonth(
    parsed.data.month,
    parsed.data.type === "all" ? undefined : parsed.data.type,
  );

  res.json({
    month: parsed.data.month,
    count: items.length,
    items,
  });
});

app.get("/api/invoices/summary", (req, res) => {
  const input = {
    month: getQueryString(req.query.month),
    type: getQueryString(req.query.type),
  };

  const parsed = invoicesQuerySchema.safeParse(input);
  if (!parsed.success) {
    sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Parametres invalides",
      formatZodError(parsed.error),
    );
    return;
  }

  const items = listInvoicesByMonth(
    parsed.data.month,
    parsed.data.type === "all" ? undefined : parsed.data.type,
  );
  const summary = items.map(buildInvoiceSummary);

  res.json({
    month: parsed.data.month,
    count: summary.length,
    items: summary,
  });
});

startPennylaneScheduler();

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
