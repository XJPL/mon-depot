import { getDb } from "./db.js";

export type InvoiceKind = "customer" | "supplier";

export type InvoiceUpsert = {
  pennylaneId: number;
  invoiceNumber?: string | null;
  date?: string | null;
  month?: string | null;
  currency?: string | null;
  amount?: string | null;
  status?: string | null;
  sourceUpdatedAt?: string | null;
  raw: unknown;
};

type InvoiceRow = {
  kind: string;
  pennylane_id: number;
  invoice_number: string | null;
  date: string | null;
  month: string | null;
  currency: string | null;
  amount: string | null;
  status: string | null;
  raw_json: string;
  source_updated_at: string | null;
  synced_at: string;
};

const toMonth = (date?: string | null) => {
  if (!date) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }
  return date.slice(0, 7);
};

const parseJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const upsertInvoices = (
  kind: InvoiceKind,
  invoices: InvoiceUpsert[],
) => {
  if (invoices.length === 0) {
    return 0;
  }

  const db = getDb();
  const statement = db.prepare(`
    INSERT INTO invoices (
      kind,
      pennylane_id,
      invoice_number,
      date,
      month,
      currency,
      amount,
      status,
      raw_json,
      source_updated_at,
      synced_at
    ) VALUES (
      @kind,
      @pennylane_id,
      @invoice_number,
      @date,
      @month,
      @currency,
      @amount,
      @status,
      @raw_json,
      @source_updated_at,
      datetime('now')
    )
    ON CONFLICT(kind, pennylane_id) DO UPDATE SET
      invoice_number = excluded.invoice_number,
      date = excluded.date,
      month = excluded.month,
      currency = excluded.currency,
      amount = excluded.amount,
      status = excluded.status,
      raw_json = excluded.raw_json,
      source_updated_at = excluded.source_updated_at,
      synced_at = excluded.synced_at
  `);

  const runTransaction = db.transaction((rows: InvoiceUpsert[]) => {
    for (const row of rows) {
      statement.run({
        kind,
        pennylane_id: row.pennylaneId,
        invoice_number: row.invoiceNumber ?? null,
        date: row.date ?? null,
        month: row.month ?? toMonth(row.date),
        currency: row.currency ?? null,
        amount: row.amount ?? null,
        status: row.status ?? null,
        raw_json: JSON.stringify(row.raw ?? null),
        source_updated_at: row.sourceUpdatedAt ?? null,
      });
    }
  });

  runTransaction(invoices);
  return invoices.length;
};

export const listInvoicesByMonth = (
  month: string,
  kind?: InvoiceKind,
) => {
  const db = getDb();
  let rows: InvoiceRow[];

  if (kind) {
    rows = db
      .prepare(
        `
      SELECT
        kind,
        pennylane_id,
        invoice_number,
        date,
        month,
        currency,
        amount,
        status,
        raw_json,
        source_updated_at,
        synced_at
      FROM invoices
      WHERE month = ? AND kind = ?
      ORDER BY date ASC, pennylane_id ASC
    `,
      )
      .all(month, kind);
  } else {
    rows = db
      .prepare(
        `
      SELECT
        kind,
        pennylane_id,
        invoice_number,
        date,
        month,
        currency,
        amount,
        status,
        raw_json,
        source_updated_at,
        synced_at
      FROM invoices
      WHERE month = ?
      ORDER BY kind ASC, date ASC, pennylane_id ASC
    `,
      )
      .all(month);
  }

  return rows.map((row) => ({
    kind: row.kind,
    pennylaneId: row.pennylane_id,
    invoiceNumber: row.invoice_number,
    date: row.date,
    month: row.month,
    currency: row.currency,
    amount: row.amount,
    status: row.status,
    sourceUpdatedAt: row.source_updated_at,
    syncedAt: row.synced_at,
    raw: parseJson(row.raw_json),
  }));
};

export const getLastSync = (kind: InvoiceKind) => {
  const db = getDb();
  const row = db
    .prepare(
      `
    SELECT last_synced_at
    FROM sync_state
    WHERE kind = ?
  `,
    )
    .get(kind) as { last_synced_at?: string } | undefined;

  return row?.last_synced_at ?? null;
};

export const setLastSync = (kind: InvoiceKind, lastSyncedAt: string) => {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO sync_state (kind, last_synced_at)
    VALUES (?, ?)
    ON CONFLICT(kind) DO UPDATE SET
      last_synced_at = excluded.last_synced_at
  `,
  ).run(kind, lastSyncedAt);
};
