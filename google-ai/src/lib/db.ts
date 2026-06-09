import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// HTTP-based Neon client — one round-trip per query, ideal for serverless route handlers.
// DATABASE_URL is provisioned by Vercel's Postgres (Neon) integration on this project.
//
// Lazily constructed: Next evaluates route modules at build time when DATABASE_URL may be absent,
// so we defer neon() until the first query instead of running it at import.
let client: NeonQueryFunction<false, false> | undefined;

function db(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}

// Tagged-template proxy so callers keep writing sql`...` while connection stays lazy.
export const sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  db()(strings, ...values)) as unknown as NeonQueryFunction<false, false>;

export type Installation = {
  id: string;
  account_name: string | null;
  contact_email: string | null;
  access_token: string;
  scopes: string[];
};

export type Resource = {
  id: string;
  installation_id: string;
  product_id: string;
  name: string;
  status: string;
  billing_plan_id: string | null;
};
