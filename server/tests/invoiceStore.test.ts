import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resetDb } from "../src/db.js";
import {
  getLastSync,
  listInvoicesByMonth,
  setLastSync,
  upsertInvoices,
} from "../src/invoiceStore.js";

const createTempDbPath = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pennylane-test-"));
  return { dir, dbPath: path.join(dir, "pennylane.sqlite") };
};

const cleanup = (dir: string) => {
  fs.rmSync(dir, { recursive: true, force: true });
};

afterEach(() => {
  resetDb();
});

describe("invoiceStore", () => {
  it("enregistre et liste les factures par mois", () => {
    const { dir, dbPath } = createTempDbPath();
    process.env.PENNYLANE_DB_PATH = dbPath;

    upsertInvoices("customer", [
      {
        pennylaneId: 1,
        invoiceNumber: "F-1",
        date: "2024-02-01",
        currency: "EUR",
        amount: "100.00",
        status: "paid",
        sourceUpdatedAt: "2024-02-02T00:00:00Z",
        raw: { id: 1 },
      },
      {
        pennylaneId: 2,
        invoiceNumber: "F-2",
        date: "2024-03-05",
        currency: "EUR",
        amount: "50.00",
        status: "paid",
        sourceUpdatedAt: "2024-03-06T00:00:00Z",
        raw: { id: 2 },
      },
    ]);

    const feb = listInvoicesByMonth("2024-02", "customer");
    expect(feb).toHaveLength(1);
    expect(feb[0].invoiceNumber).toBe("F-1");
    expect(feb[0].amount).toBe("100.00");

    resetDb();
    cleanup(dir);
  });

  it("stocke et recupere la derniere sync", () => {
    const { dir, dbPath } = createTempDbPath();
    process.env.PENNYLANE_DB_PATH = dbPath;

    setLastSync("supplier", "2024-02-10T10:00:00Z");
    const value = getLastSync("supplier");

    expect(value).toBe("2024-02-10T10:00:00Z");

    resetDb();
    cleanup(dir);
  });
});
