import express from "express";
import {
  fetchPennylane,
  fetchPennylaneAllPages,
} from "./pennylane.js";
import {
  type InvoiceKind,
  listInvoicesByMonth,
  upsertInvoices,
} from "./invoiceStore.js";

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
    return typeof value[0] === "string" ? value[0] : undefined;
  }
  return typeof value === "string" ? value : undefined;
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

const parseMonth = (value?: string) => {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) {
    return null;
  }
  return { value, year, month };
};

const getMonthRange = (year: number, month: number) => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

const parseLimit = (value?: string) => {
  if (!value) {
    return 100;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const rounded = Math.floor(parsed);
  if (rounded < 1 || rounded > 100) {
    return null;
  }
  return rounded;
};

const toAmountString = (value: unknown) => {
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "string") {
    return value;
  }
  return null;
};

const normalizeInvoice = (item: Record<string, unknown>) => {
  const id = item.id;
  if (typeof id !== "number") {
    return null;
  }
  const invoiceNumber =
    typeof item.invoice_number === "string" ? item.invoice_number : null;
  const date = typeof item.date === "string" ? item.date : null;
  const currency = typeof item.currency === "string" ? item.currency : null;
  const amount =
    toAmountString(item.currency_amount) ?? toAmountString(item.amount);
  const status =
    typeof item.status === "string"
      ? item.status
      : typeof item.payment_status === "string"
        ? item.payment_status
        : typeof item.accounting_status === "string"
          ? item.accounting_status
          : null;
  const updatedAt =
    typeof item.updated_at === "string" ? item.updated_at : null;

  return {
    pennylaneId: id,
    invoiceNumber,
    date,
    currency,
    amount,
    status,
    sourceUpdatedAt: updatedAt,
    raw: item,
  };
};

const syncPennylaneInvoices = async (
  kind: InvoiceKind,
  query: Record<string, unknown>,
) => {
  const path =
    kind === "customer" ? "/customer_invoices" : "/supplier_invoices";
  let stored = 0;

  const summary = await fetchPennylaneAllPages<Record<string, unknown>>(
    path,
    query,
    (items) => {
      const normalized = items
        .map((item) => normalizeInvoice(item))
        .filter((item): item is NonNullable<typeof item> => item !== null);
      stored += upsertInvoices(kind, normalized);
    },
  );

  return {
    kind,
    pages: summary.pageCount,
    fetched: summary.totalItems,
    stored,
  };
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

  const query: Record<string, unknown> = {
    limit,
  };

  if (parsedMonth) {
    const range = getMonthRange(parsedMonth.year, parsedMonth.month);
    query["filter[date][gteq]"] = range.start;
    query["filter[date][lteq]"] = range.end;
  }

  try {
    const kinds: InvoiceKind[] =
      kind === "all" ? ["customer", "supplier"] : [kind];
    const results = [];

    for (const entry of kinds) {
      results.push(await syncPennylaneInvoices(entry, query));
    }

    res.json({
      month: parsedMonth?.value ?? null,
      results,
    });
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

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
