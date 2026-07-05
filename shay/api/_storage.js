// Object storage for stone images — Cloudflare R2 bucket "shay-stones",
// served publicly from https://cdn.shaym.beauty. Writes go through the
// Cloudflare REST API using CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN
// (the same token already provisioned for the account). The Supabase
// `stones`/`dreams`/`worlds` tables remain the metadata source of truth;
// only the image bytes live in R2.

const R2_BUCKET = process.env.R2_BUCKET || "shay-stones";
const CDN = (process.env.R2_PUBLIC_BASE || "https://cdn.shaym.beauty").replace(/\/$/, "");
const CF_API = "https://api.cloudflare.com/client/v4";

// Upload bytes to R2 under `key` (no leading slash, no bucket prefix) and
// return the public CDN URL. Throws on misconfig or a non-2xx response.
async function r2put(key, body, contentType = "image/jpeg") {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  const tok = process.env.CLOUDFLARE_API_TOKEN;
  if (!acct || !tok) throw new Error("R2 not configured (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN)");
  const k = String(key).replace(/^\/+/, "");
  const r = await fetch(`${CF_API}/accounts/${acct}/r2/buckets/${R2_BUCKET}/objects/${k}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${tok}`, "Content-Type": contentType },
    body,
  });
  if (!r.ok) throw new Error(`R2 put ${k}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return `${CDN}/${k}`;
}

// Read an object back through the authenticated R2 API (NOT the public CDN, so
// the value is always fresh — no Cloudflare edge cache between write and read).
// Returns the body as text, or null if the key doesn't exist.
async function r2get(key) {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  const tok = process.env.CLOUDFLARE_API_TOKEN;
  if (!acct || !tok) throw new Error("R2 not configured (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN)");
  const k = String(key).replace(/^\/+/, "");
  const r = await fetch(`${CF_API}/accounts/${acct}/r2/buckets/${R2_BUCKET}/objects/${k}`, {
    headers: { Authorization: `Bearer ${tok}` },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`R2 get ${k}: ${r.status}`);
  return await r.text();
}

async function r2getJson(key) {
  const t = await r2get(key);
  if (t == null) return null;
  try { return JSON.parse(t); } catch { return null; }
}

// Delete an object from R2. A missing key (404) is treated as success.
async function r2del(key) {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  const tok = process.env.CLOUDFLARE_API_TOKEN;
  if (!acct || !tok) throw new Error("R2 not configured (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN)");
  const k = String(key).replace(/^\/+/, "");
  const r = await fetch(`${CF_API}/accounts/${acct}/r2/buckets/${R2_BUCKET}/objects/${k}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tok}` },
  });
  if (!r.ok && r.status !== 404) throw new Error(`R2 del ${k}: ${r.status}`);
}

module.exports = { r2put, r2get, r2getJson, r2del, R2_BUCKET, CDN };
