import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchPennylaneAllPagesMock = vi.fn();
const getLastSyncMock = vi.fn();
const setLastSyncMock = vi.fn();
const upsertInvoicesMock = vi.fn(() => 0);

vi.mock("../src/pennylane.js", () => ({
  fetchPennylaneAllPages: fetchPennylaneAllPagesMock,
}));

vi.mock("../src/invoiceStore.js", () => ({
  getLastSync: getLastSyncMock,
  setLastSync: setLastSyncMock,
  upsertInvoices: upsertInvoicesMock,
}));

import {
  parseDateOnly,
  parseLimit,
  parseMonth,
  syncPennylane,
} from "../src/syncService.js";

describe("syncService parsing", () => {
  it("parseMonth accepte YYYY-MM", () => {
    expect(parseMonth("2024-02")?.value).toBe("2024-02");
    expect(parseMonth("2024-13")).toBeNull();
    expect(parseMonth("202402")).toBeNull();
  });

  it("parseDateOnly accepte YYYY-MM-DD", () => {
    expect(parseDateOnly("2024-02-10")).toBe("2024-02-10");
    expect(parseDateOnly("2024-02-")).toBeNull();
    expect(parseDateOnly("20240210")).toBeNull();
  });

  it("parseLimit valide la plage 1-100", () => {
    expect(parseLimit("1")).toBe(1);
    expect(parseLimit("100")).toBe(100);
    expect(parseLimit("0")).toBeNull();
    expect(parseLimit("101")).toBeNull();
  });
});

describe("syncService incremental", () => {
  beforeEach(() => {
    fetchPennylaneAllPagesMock.mockReset();
    getLastSyncMock.mockReset();
    setLastSyncMock.mockReset();
    upsertInvoicesMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("utilise la date de derniere sync en mode incremental", async () => {
    getLastSyncMock.mockReturnValue("2024-02-10T12:00:00Z");

    fetchPennylaneAllPagesMock.mockImplementation(
      async (_path, query, onPage) => {
        await onPage(
          [
            {
              id: 42,
              invoice_number: "F-42",
              date: "2024-02-12",
              currency: "EUR",
              amount: "10.0",
              updated_at: "2024-02-12T10:00:00Z",
            },
          ],
          { items: [], next_cursor: null },
        );
        return { pageCount: 1, totalItems: 1 };
      },
    );

    const result = await syncPennylane({
      type: "customer",
      incremental: true,
      limit: 50,
    });

    expect(fetchPennylaneAllPagesMock).toHaveBeenCalled();
    const query = fetchPennylaneAllPagesMock.mock.calls[0][1];
    expect(query).toMatchObject({
      limit: 50,
      filter: {
        date: {
          gteq: "2024-02-10",
          lteq: "2024-02-15",
        },
      },
    });

    expect(upsertInvoicesMock).toHaveBeenCalledTimes(1);
    expect(setLastSyncMock).toHaveBeenCalledWith(
      "customer",
      "2024-02-15T10:00:00.000Z",
    );
    expect(result.results[0].stored).toBe(1);
  });
});
