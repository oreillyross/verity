import "dotenv/config";
import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, name: "verity-server" }));

// API routes
app.get("/api/interactions", (_req, res) => res.json({ items: [], nextCursor: null }));
app.post("/api/interactions", (_req, res) =>
  res.status(501).json({ error: "Not implemented yet" }),
);

// DEV: proxy everything else to Vite
if (process.env.NODE_ENV !== "production") {
  app.use(
    "/",
    createProxyMiddleware({
      target: "http://127.0.0.1:5173",
      changeOrigin: true,
      ws: true,
    }),
  );
}

const port = Number(process.env.PORT ?? 8080);
app.listen(port, "0.0.0.0", () => {
  console.log(`verity server listening on :${port}`);
});