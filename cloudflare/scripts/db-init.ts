// Applies db/schema.sql to DATABASE_URL. Run once after provisioning the Vercel/Neon Postgres:
//   DATABASE_URL=... bun run scripts/db-init.ts
import { readFileSync } from "node:fs";
import { Client } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");

const client = new Client(url);
await client.connect();
// Simple-query protocol runs all statements in the file in one round-trip.
await client.query(schema);
await client.end();
console.log("✓ schema applied");
