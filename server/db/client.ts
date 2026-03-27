import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const url = new URL(connectionString);

// Treat these as "local-ish" hosts too (docker compose service names, etc.)
const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "db", "postgres"]);
const isLocalHost = localHosts.has(url.hostname);

// Explicit mode
const nodeEnv = process.env.NODE_ENV ?? "development";
const isDev = nodeEnv !== "production";

// Optional explicit knob: PGSSLMODE=disable|require
const pgsslmode = (process.env.PGSSLMODE ?? "").toLowerCase();

const ssl =
  pgsslmode === "disable"
    ? false
    : pgsslmode === "require"
      ? "require"
      : isDev
        ? false // ✅ dev default
        : isLocalHost
          ? false
          : "require"; // ✅ prod default

export const client = postgres(connectionString, {
  ssl,
  max: 10,
});

export const db = drizzle(client, { schema });