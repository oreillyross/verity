import type { Express } from "express";
import { HealthSchema } from "../shared/contracts.js";

export function registerApi(app: Express) {
  app.get("/api/health", (_req, res) => {
    const payload = { ok: true, name: "verity" };
    // optional runtime validation
    const parsed = HealthSchema.safeParse(payload);
    if (!parsed.success) return res.status(500).json({ ok: false });

    res.json(parsed.data);
  });
}