import express from "express";
import { fetchPennylane } from "./pennylane.js";

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "API en ligne" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const sendPennylaneResponse = async (
  res: express.Response,
  response: Awaited<ReturnType<typeof fetch>>,
) => {
  if (response.status === 204) {
    res.status(204).end();
    return;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  if (contentType.includes("application/json") && raw) {
    try {
      res.status(response.status).json(JSON.parse(raw));
      return;
    } catch {
      // Fall through to plain text.
    }
  }

  res.status(response.status).send(raw);
};

const handlePennylaneList = async (
  req: express.Request,
  res: express.Response,
  path: string,
) => {
  try {
    const response = await fetchPennylane(
      path,
      req.query as Record<string, unknown>,
    );
    await sendPennylaneResponse(res, response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    res.status(500).json({ error: message });
  }
};

app.get("/api/pennylane/customer-invoices", (req, res) => {
  handlePennylaneList(req, res, "/customer_invoices");
});

app.get("/api/pennylane/supplier-invoices", (req, res) => {
  handlePennylaneList(req, res, "/supplier_invoices");
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
