import { fetchPennylaneAllPages } from "./pennylane.js";
import {
  type InvoiceKind,
  getLastSync,
  setLastSync,
  upsertInvoices,
} from "./invoiceStore.js";

type SyncMode = "full" | "month" | "incremental";

export type SyncOptions = {
  type: InvoiceKind | "all";
  month?: string;
  limit?: number;
  incremental?: boolean;
  since?: string;
};

export type SyncResult = {
  kind: InvoiceKind;
  pages: number;
  fetched: number;
  stored: number;
  range: {
    start?: string;
    end?: string;
    mode: SyncMode;
    previousSync?: string | null;
  };
  syncedAt: string;
};

const toDateOnly = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
};

export const parseDateOnly = (value?: string) => {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || month < 1 || month > 12) {
    return null;
  }
  if (!Number.isFinite(day) || day < 1 || day > 31) {
    return null;
  }
  return value;
};

export const parseMonth = (value?: string) => {
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

export const parseLimit = (value?: string) => {
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

const getMonthRange = (year: number, month: number) => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const maxDate = (left?: string, right?: string) => {
  if (left && right) {
    return left > right ? left : right;
  }
  return left ?? right;
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
    typeof item.currency_amount === "string"
      ? item.currency_amount
      : typeof item.currency_amount === "number"
        ? item.currency_amount.toString()
        : typeof item.amount === "string"
          ? item.amount
          : typeof item.amount === "number"
            ? item.amount.toString()
            : null;
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

const buildRange = (
  kind: InvoiceKind,
  options: SyncOptions,
): {
  start?: string;
  end?: string;
  mode: SyncMode;
  previousSync?: string | null;
} => {
  let start: string | undefined;
  let end: string | undefined;
  let mode: SyncMode = "full";

  if (options.month) {
    const parsed = parseMonth(options.month);
    if (parsed) {
      const range = getMonthRange(parsed.year, parsed.month);
      start = range.start;
      end = range.end;
      mode = "month";
    }
  }

  let incrementalDate = options.since ?? undefined;
  let previousSync: string | null | undefined;
  if (!incrementalDate && options.incremental) {
    previousSync = getLastSync(kind);
    incrementalDate = toDateOnly(previousSync ?? undefined) ?? undefined;
  }

  if (incrementalDate) {
    start = maxDate(start, incrementalDate);
    end = end ?? todayDate();
    mode = options.month ? "month" : "incremental";
  }

  return { start, end, mode, previousSync };
};

const buildQuery = (range: { start?: string; end?: string }) => {
  const filter: Record<string, Record<string, string>> = {};

  if (range.start || range.end) {
    filter.date = {};
    if (range.start) {
      filter.date.gteq = range.start;
    }
    if (range.end) {
      filter.date.lteq = range.end;
    }
  }

  return Object.keys(filter).length > 0 ? { filter } : {};
};

const syncPennylaneInvoices = async (
  kind: InvoiceKind,
  options: SyncOptions,
): Promise<SyncResult> => {
  const path =
    kind === "customer" ? "/customer_invoices" : "/supplier_invoices";

  const limit = options.limit ?? 100;
  const range = buildRange(kind, options);
  const query = {
    limit,
    ...buildQuery(range),
  };

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

  const syncedAt = new Date().toISOString();
  setLastSync(kind, syncedAt);

  return {
    kind,
    pages: summary.pageCount,
    fetched: summary.totalItems,
    stored,
    range,
    syncedAt,
  };
};

export const syncPennylane = async (
  options: SyncOptions,
): Promise<{
  requested: SyncOptions;
  results: SyncResult[];
}> => {
  const kinds: InvoiceKind[] =
    options.type === "all" ? ["customer", "supplier"] : [options.type];

  const results: SyncResult[] = [];
  for (const kind of kinds) {
    results.push(await syncPennylaneInvoices(kind, options));
  }

  return {
    requested: options,
    results,
  };
};
