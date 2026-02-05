import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_DB_PATH = path.resolve(
  process.cwd(),
  "data",
  "pennylane.sqlite",
);

const resolveDbPath = () => {
  const envPath = process.env.PENNYLANE_DB_PATH;
  if (!envPath) {
    return DEFAULT_DB_PATH;
  }
  return path.isAbsolute(envPath)
    ? envPath
    : path.resolve(process.cwd(), envPath);
};

const ensureDirectory = (filePath: string) => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
};

let dbInstance: Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  pennylane_id INTEGER NOT NULL,
  invoice_number TEXT,
  date TEXT,
  month TEXT,
  currency TEXT,
  amount TEXT,
  status TEXT,
  raw_json TEXT NOT NULL,
  source_updated_at TEXT,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_kind_pennylane_id
  ON invoices(kind, pennylane_id);

CREATE INDEX IF NOT EXISTS invoices_month_kind
  ON invoices(month, kind);
`;

export const getDb = () => {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = resolveDbPath();
  ensureDirectory(dbPath);

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);

  dbInstance = db;
  return dbInstance;
};
