import autocannon from "autocannon";

const baseUrl = process.env.LOAD_BASE_URL ?? "http://localhost:3001";
const path = process.env.LOAD_PATH ?? "/api/health";
const method = process.env.LOAD_METHOD ?? "GET";
const duration = Number(process.env.LOAD_DURATION ?? "10");
const connections = Number(process.env.LOAD_CONNECTIONS ?? "20");

const url = new URL(path, baseUrl).toString();

if (!Number.isFinite(duration) || duration <= 0) {
  throw new Error("LOAD_DURATION invalide");
}
if (!Number.isFinite(connections) || connections <= 0) {
  throw new Error("LOAD_CONNECTIONS invalide");
}

const instance = autocannon(
  {
    url,
    method,
    duration,
    connections,
  },
  (err, results) => {
    if (err) {
      console.error("Erreur load test:", err.message);
      process.exitCode = 1;
      return;
    }
    console.log("Load test termine");
    console.log(`URL: ${url}`);
    console.log(`Requests/sec: ${results.requests.average}`);
    console.log(`Latency (avg): ${results.latency.average} ms`);
    console.log(`2xx: ${results['2xx'] ?? 0}`);
  },
);

autocannon.track(instance, { renderProgressBar: true });
