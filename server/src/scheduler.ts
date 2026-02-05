import cron from "node-cron";
import type { InvoiceKind } from "./invoiceStore.js";
import {
  parseDateOnly,
  parseLimit,
  parseMonth,
  syncPennylane,
} from "./syncService.js";

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
};

const parseType = (value: string | undefined) => {
  if (!value || value === "all") {
    return "all";
  }
  if (value === "customer" || value === "supplier") {
    return value as InvoiceKind;
  }
  return null;
};

export const startPennylaneScheduler = () => {
  const cronExpression = process.env.PENNYLANE_CRON;
  if (!cronExpression) {
    return null;
  }

  const type = parseType(process.env.PENNYLANE_CRON_TYPE);
  if (!type) {
    console.error(
      "[pennylane-cron] PENNYLANE_CRON_TYPE invalide (customer|supplier|all)",
    );
    return null;
  }

  const limitValue = process.env.PENNYLANE_CRON_LIMIT;
  const limit = parseLimit(limitValue);
  if (!limit) {
    console.error(
      "[pennylane-cron] PENNYLANE_CRON_LIMIT invalide (1-100)",
    );
    return null;
  }

  const monthValue = process.env.PENNYLANE_CRON_MONTH;
  const month = monthValue ? parseMonth(monthValue) : null;
  if (monthValue && !month) {
    console.error("[pennylane-cron] PENNYLANE_CRON_MONTH invalide (YYYY-MM)");
    return null;
  }

  const sinceValue = process.env.PENNYLANE_CRON_SINCE;
  const since = sinceValue ? parseDateOnly(sinceValue) : null;
  if (sinceValue && !since) {
    console.error("[pennylane-cron] PENNYLANE_CRON_SINCE invalide (YYYY-MM-DD)");
    return null;
  }

  const incremental = parseBoolean(
    process.env.PENNYLANE_CRON_INCREMENTAL,
    true,
  );
  const runOnStart = parseBoolean(
    process.env.PENNYLANE_CRON_RUN_ON_START,
    false,
  );
  const timezone = process.env.PENNYLANE_CRON_TZ;

  let running = false;

  const run = async () => {
    if (running) {
      console.warn("[pennylane-cron] sync deja en cours, ignore.");
      return;
    }
    running = true;
    try {
      const result = await syncPennylane({
        type,
        month: month?.value,
        limit,
        incremental,
        since: since ?? undefined,
      });
      console.log("[pennylane-cron] sync termine", JSON.stringify(result));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      console.error("[pennylane-cron] erreur", message);
    } finally {
      running = false;
    }
  };

  try {
    const task = cron.schedule(cronExpression, run, {
      timezone,
    });

    if (runOnStart) {
      void run();
    }

    console.log("[pennylane-cron] planifie", cronExpression);
    return task;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[pennylane-cron] expression invalide", message);
    return null;
  }
};
