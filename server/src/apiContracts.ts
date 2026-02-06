import { z } from "zod";

const invoiceTypeSchema = z.enum(["customer", "supplier", "all"]);
const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Format attendu: YYYY-MM");
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu: YYYY-MM-DD");

const booleanFromString = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "off"].includes(normalized)) {
      return false;
    }
    return null;
  }
  return null;
}, z.boolean());

const limitSchema = z
  .coerce
  .number()
  .int()
  .min(1, "Minimum 1")
  .max(100, "Maximum 100");

export const syncQuerySchema = z
  .object({
    type: invoiceTypeSchema.default("all"),
    month: monthSchema.optional(),
    limit: limitSchema.default(100),
    incremental: booleanFromString.optional(),
    since: dateSchema.optional(),
  })
  .strict();

export const invoicesQuerySchema = z
  .object({
    month: monthSchema,
    type: invoiceTypeSchema.default("all"),
  })
  .strict();
