import { useEffect, useState } from "react";
import "./App.css";

type InvoiceItem = Record<string, unknown>;

type InvoiceSummary = {
  date: string | null;
  invoiceNumber: string | null;
  tiers: string | null;
  ttc: string | null;
  tva: string | null;
  ht: string | null;
};

const toAmount = (value: unknown) => {
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "string") {
    return value;
  }
  return null;
};

const toString = (value: unknown) =>
  typeof value === "string" ? value : null;

const extractTier = (item: InvoiceItem, kind: "customer" | "supplier") => {
  const entityKey = kind === "customer" ? "customer" : "supplier";
  const entity = item[entityKey];
  const record =
    entity && typeof entity === "object"
      ? (entity as Record<string, unknown>)
      : null;
  const name =
    (record && toString(record.name)) ||
    (record && toString(record.company_name)) ||
    (record && toString(record.legal_name)) ||
    (record && toString(record.display_name)) ||
    (kind === "customer"
      ? toString(item.customer_name)
      : toString(item.supplier_name)) ||
    toString(item.tier_name) ||
    toString(item.third_party_name);
  const id = record && typeof record.id === "number" ? record.id : null;
  if (name) {
    return name;
  }
  if (id !== null) {
    return `${entityKey}_${id}`;
  }
  return null;
};

const buildSummary = (
  item: InvoiceItem,
  kind: "customer" | "supplier",
): InvoiceSummary => {
  return {
    date: toString(item.date),
    invoiceNumber: toString(item.invoice_number),
    tiers: extractTier(item, kind),
    ttc: toAmount(item.currency_amount ?? item.amount),
    ht: toAmount(item.currency_amount_before_tax),
    tva: toAmount(item.tax ?? item.currency_tax),
  };
};

function App() {
  const [health, setHealth] = useState("chargement...");
  const [apiKey, setApiKey] = useState("");
  const [invoiceType, setInvoiceType] =
    useState<"customer" | "supplier">("customer");
  const [dossierCode, setDossierCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<InvoiceSummary[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setHealth(data?.status ?? "ok");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth("erreur");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!apiKey.trim()) {
      setError("Veuillez saisir la cle API.");
      return;
    }

    setLoading(true);
    setError(null);
    setItems([]);

    try {
      const endpoint =
        invoiceType === "customer"
          ? "/api/pennylane/customer-invoices"
          : "/api/pennylane/supplier-invoices";
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (dossierCode.trim()) {
        params.set("filter[external_reference][eq]", dossierCode.trim());
      }

      const response = await fetch(`${endpoint}?${params.toString()}`, {
        headers: {
          "X-Pennylane-Token": apiKey.trim(),
        },
      });

      const payload = await response.json();
      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : typeof payload?.message === "string"
              ? payload.message
              : "Erreur lors de la recuperation";
        throw new Error(message);
      }

      const itemsList = Array.isArray(payload?.items) ? payload.items : [];
      const summaries = itemsList.map((item: InvoiceItem) =>
        buildSummary(item, invoiceType),
      );
      setItems(summaries);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setApiKey("");
    setInvoiceType("customer");
    setDossierCode("");
    setItems([]);
    setError(null);
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Recupfactures</h1>
          <p className="subtitle">
            Interface de recuperation Pennylane
          </p>
        </div>
        <span className="health">API: {health}</span>
      </header>

      <form className="card form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="apiKey">Cle API Pennylane</label>
          <input
            id="apiKey"
            type="password"
            placeholder="Bearer token"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="invoiceType">Type</label>
          <select
            id="invoiceType"
            value={invoiceType}
            onChange={(event) =>
              setInvoiceType(event.target.value as "customer" | "supplier")
            }
          >
            <option value="customer">customer_invoices</option>
            <option value="supplier">supplier_invoices</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="dossierCode">Code dossier</label>
          <input
            id="dossierCode"
            type="text"
            placeholder="External reference"
            value={dossierCode}
            onChange={(event) => setDossierCode(event.target.value)}
          />
          <small className="helper">
            Filtre applique sur external_reference.
          </small>
        </div>

        <div className="actions">
          <button type="submit" disabled={loading}>
            {loading ? "Chargement..." : "Valider"}
          </button>
          <button type="button" className="secondary" onClick={handleCancel}>
            Annuler
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </form>

      <section className="card results">
        <h2>Resultats</h2>
        {items.length === 0 ? (
          <p className="muted">Aucune facture a afficher.</p>
        ) : (
          <div className="table">
            <div className="table-head">
              <span>Date</span>
              <span>Numero</span>
              <span>Tiers</span>
              <span>TTC</span>
              <span>TVA</span>
              <span>HT</span>
            </div>
            {items.map((item, index) => (
              <div className="table-row" key={`${item.invoiceNumber}-${index}`}>
                <span>{item.date ?? "-"}</span>
                <span>{item.invoiceNumber ?? "-"}</span>
                <span>{item.tiers ?? "-"}</span>
                <span>{item.ttc ?? "-"}</span>
                <span>{item.tva ?? "-"}</span>
                <span>{item.ht ?? "-"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
