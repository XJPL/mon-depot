import type { InvoiceKind, StoredInvoice } from "./invoiceStore.js";

export type InvoiceSummary = {
  kind: InvoiceKind;
  date: string | null;
  invoiceNumber: string | null;
  tiers: string | null;
  tiersId: number | null;
  currency: string | null;
  ttc: string | null;
  ht: string | null;
  tva: string | null;
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

const toStringValue = (value: unknown) =>
  typeof value === "string" ? value : null;

const toNumberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const joinNameParts = (...parts: Array<string | null>) => {
  const cleaned = parts.filter((part) => part && part.trim().length > 0);
  if (cleaned.length === 0) {
    return null;
  }
  return cleaned.join(" ");
};

const extractTier = (item: Record<string, unknown>, kind: InvoiceKind) => {
  const entityKey = kind === "customer" ? "customer" : "supplier";
  const entity = item[entityKey];
  const entityRecord =
    entity && typeof entity === "object"
      ? (entity as Record<string, unknown>)
      : null;

  const id = entityRecord ? toNumberValue(entityRecord.id) : null;

  const nameFromEntity =
    (entityRecord && toStringValue(entityRecord.name)) ||
    (entityRecord && toStringValue(entityRecord.company_name)) ||
    (entityRecord && toStringValue(entityRecord.legal_name)) ||
    (entityRecord && toStringValue(entityRecord.display_name)) ||
    joinNameParts(
      entityRecord ? toStringValue(entityRecord.first_name) : null,
      entityRecord ? toStringValue(entityRecord.last_name) : null,
    );

  const nameFromItem =
    (kind === "customer"
      ? toStringValue(item.customer_name)
      : toStringValue(item.supplier_name)) ||
    toStringValue(item.tier_name) ||
    toStringValue(item.third_party_name);

  const name = nameFromEntity || nameFromItem;

  if (name) {
    return { id, label: name };
  }

  if (id !== null) {
    return { id, label: `${entityKey}_${id}` };
  }

  return { id: null, label: null };
};

export const buildInvoiceSummary = (item: StoredInvoice): InvoiceSummary => {
  const raw = item.raw;
  const record =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : null;
  const currency =
    record && typeof record.currency === "string"
      ? record.currency
      : item.currency;
  const ttc =
    record && "currency_amount" in record
      ? toAmountString(record.currency_amount)
      : toAmountString(record?.amount);
  const ht =
    record && "currency_amount_before_tax" in record
      ? toAmountString(record.currency_amount_before_tax)
      : null;
  const tva =
    record && "tax" in record
      ? toAmountString(record.tax)
      : toAmountString(record?.currency_tax);

  const kind: InvoiceKind =
    item.kind === "supplier" ? "supplier" : "customer";
  const tier = record ? extractTier(record, kind) : { id: null, label: null };

  return {
    kind,
    date: item.date,
    invoiceNumber: item.invoiceNumber,
    tiers: tier.label,
    tiersId: tier.id,
    currency,
    ttc,
    ht,
    tva,
  };
};
