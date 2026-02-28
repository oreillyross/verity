import { useState } from "react";

export default function App() {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkHealth() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/health");
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }

      const json = await res.json();
      setData(JSON.stringify(json));
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Verity</h1>

      <button
        onClick={checkHealth}
        style={{
          padding: "10px 20px",
          fontSize: 16,
          cursor: "pointer"
        }}
      >
        Check API Health
      </button>

      {loading && <p>Loading...</p>}

      {data && (
        <pre
          style={{
            marginTop: 20,
            background: "#f4f4f4",
            padding: 16
          }}
        >
          {data}
        </pre>
      )}

      {error && (
        <p style={{ color: "red", marginTop: 20 }}>
          Error: {error}
        </p>
      )}
    </div>
  );
}