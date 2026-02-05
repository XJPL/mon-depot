import { syncPennylane, parseDateOnly, parseLimit, parseMonth } from "./syncService.js";
import type { InvoiceKind } from "./invoiceStore.js";

type CliOptions = {
  type?: string;
  month?: string;
  limit?: string;
  incremental?: boolean;
  since?: string;
  help?: boolean;
};

const parseBoolean = (value?: string) => {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return null;
};

const parseArgs = (args: string[]) => {
  const options: CliOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--incremental") {
      options.incremental = true;
      continue;
    }
    if (arg === "--no-incremental") {
      options.incremental = false;
      continue;
    }

    if (arg.startsWith("--incremental=")) {
      options.incremental = parseBoolean(arg.split("=")[1]) ?? true;
      continue;
    }

    const next = args[index + 1];

    if (arg === "--type" && next) {
      options.type = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--type=")) {
      options.type = arg.split("=")[1];
      continue;
    }

    if (arg === "--month" && next) {
      options.month = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--month=")) {
      options.month = arg.split("=")[1];
      continue;
    }

    if (arg === "--limit" && next) {
      options.limit = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      options.limit = arg.split("=")[1];
      continue;
    }

    if (arg === "--since" && next) {
      options.since = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--since=")) {
      options.since = arg.split("=")[1];
      continue;
    }
  }

  return options;
};

const printHelp = () => {
  console.log(`Usage: npm run sync -- [options]

Options:
  --type=customer|supplier|all   Type de factures (defaut: all)
  --month=YYYY-MM                Filtrer par mois
  --since=YYYY-MM-DD             Date de debut pour le mode incremental
  --limit=1-100                  Taille de page (defaut: 100)
  --incremental                  Active le mode incremental
  --no-incremental               Desactive le mode incremental
  -h, --help                     Affiche l'aide
`);
};

const parseType = (value?: string) => {
  if (!value || value === "all") {
    return "all";
  }
  if (value === "customer" || value === "supplier") {
    return value as InvoiceKind;
  }
  return null;
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const type = parseType(options.type);
  if (!type) {
    throw new Error("type invalide (customer|supplier|all)");
  }

  const month = options.month ? parseMonth(options.month) : null;
  if (options.month && !month) {
    throw new Error("month invalide (YYYY-MM)");
  }

  const limit = parseLimit(options.limit);
  if (!limit) {
    throw new Error("limit invalide (1-100)");
  }

  const since = options.since ? parseDateOnly(options.since) : null;
  if (options.since && !since) {
    throw new Error("since invalide (YYYY-MM-DD)");
  }

  const incremental = options.incremental ?? false;

  const result = await syncPennylane({
    type,
    month: month?.value,
    limit,
    incremental,
    since: since ?? undefined,
  });

  console.log(JSON.stringify(result, null, 2));
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Erreur:", message);
  process.exitCode = 1;
});
