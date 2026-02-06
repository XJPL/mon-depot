import { describe, expect, it } from "vitest";
import { buildInvoiceSummary } from "../src/invoiceSummary.js";
import type { StoredInvoice } from "../src/invoiceStore.js";

describe("invoiceSummary regression", () => {
  it("garde un resume stable pour les ventes", () => {
    const stored: StoredInvoice = {
      kind: "customer",
      pennylaneId: 42,
      invoiceNumber: "F-2024-0001",
      date: "2024-02-10",
      month: "2024-02",
      currency: "EUR",
      amount: "1200.00",
      status: "paid",
      sourceUpdatedAt: "2024-02-11T10:00:00Z",
      syncedAt: "2024-02-11T10:00:00Z",
      raw: {
        id: 42,
        invoice_number: "F-2024-0001",
        date: "2024-02-10",
        currency: "EUR",
        currency_amount: "1200.00",
        currency_amount_before_tax: "1000.00",
        tax: "200.00",
        customer: { id: 7 },
      },
    };

    const summary = buildInvoiceSummary(stored);
    expect(summary).toMatchInlineSnapshot(`
      {
        "currency": "EUR",
        "date": "2024-02-10",
        "ht": "1000.00",
        "invoiceNumber": "F-2024-0001",
        "kind": "customer",
        "tiers": "customer_7",
        "tiersId": 7,
        "ttc": "1200.00",
        "tva": "200.00",
      }
    `);
  });

  it("garde un resume stable pour les achats", () => {
    const stored: StoredInvoice = {
      kind: "supplier",
      pennylaneId: 99,
      invoiceNumber: "A-2024-0002",
      date: "2024-02-05",
      month: "2024-02",
      currency: "EUR",
      amount: "300.00",
      status: "paid",
      sourceUpdatedAt: "2024-02-06T10:00:00Z",
      syncedAt: "2024-02-06T10:00:00Z",
      raw: {
        id: 99,
        invoice_number: "A-2024-0002",
        date: "2024-02-05",
        currency: "EUR",
        amount: "300.00",
        currency_amount_before_tax: "250.00",
        currency_tax: "50.00",
        supplier: { id: 11, name: "Fournisseur Test" },
      },
    };

    const summary = buildInvoiceSummary(stored);
    expect(summary).toMatchInlineSnapshot(`
      {
        "currency": "EUR",
        "date": "2024-02-05",
        "ht": "250.00",
        "invoiceNumber": "A-2024-0002",
        "kind": "supplier",
        "tiers": "Fournisseur Test",
        "tiersId": 11,
        "ttc": "300.00",
        "tva": "50.00",
      }
    `);
  });
});
