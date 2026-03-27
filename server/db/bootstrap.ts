import { client } from "./client.js";

export async function bootstrapDatabase() {
  try {
    await client`select 1`
    await client.unsafe(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `);
  } catch (err) {
    console.warn("pgcrypto extension could not be created:", err);
  }
}