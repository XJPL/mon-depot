import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  const [health, setHealth] = useState("chargement...");

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

  return (
    <div className="app">
      <h1>Node.js + TypeScript + React</h1>
      <p>
        Statut API: <strong>{health}</strong>
      </p>
      <div className="card">
        <button onClick={() => setCount((current) => current + 1)}>
          count is {count}
        </button>
        <p>
          Editez <code>src/App.tsx</code> et sauvegardez.
        </p>
      </div>
    </div>
  );
}

export default App;
