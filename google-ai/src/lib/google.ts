// Upstream calls to Google, made with OUR credentials. The proxy forwards the customer's request
// here, we attach our key/token, and return Google's response while reporting usage for metering.
import { GoogleAuth } from "google-auth-library";

const GEMINI_BASE = "https://generativelanguage.googleapis.com";
const MAPS_BASE = "https://maps.googleapis.com/maps/api";
const SEARCH_BASE = "https://www.googleapis.com/customsearch/v1";

export type UpstreamResult = {
  status: number;
  contentType: string;
  body: ArrayBuffer;
  usage?: { metric: string; quantity: number; units: string };
};

function jsonResult(status: number, obj: unknown, usage?: UpstreamResult["usage"]): UpstreamResult {
  return { status, contentType: "application/json", body: new TextEncoder().encode(JSON.stringify(obj)).buffer as ArrayBuffer, usage };
}

// ── Gemini (Generative Language API) — token-billed ──────────────────────────
export async function forwardGemini(path: string, method: string, body: ArrayBuffer | null): Promise<UpstreamResult> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY not configured");
  const url = new URL(`${GEMINI_BASE}/${path.replace(/^\/+/, "")}`);
  url.searchParams.set("key", key);
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body && method !== "GET" ? body : undefined });
  const buf = await res.arrayBuffer();
  let usage: UpstreamResult["usage"];
  try {
    const total = JSON.parse(new TextDecoder().decode(buf))?.usageMetadata?.totalTokenCount;
    if (typeof total === "number") usage = { metric: "gemini_tokens", quantity: total, units: "tokens" };
  } catch {}
  return { status: res.status, contentType: res.headers.get("content-type") ?? "application/json", body: buf, usage };
}

// ── Maps (Geocoding / Places / Directions legacy endpoints) — call-billed ────
export async function forwardMaps(path: string, search: string): Promise<UpstreamResult> {
  const key = process.env.GOOGLE_MAPS_SEARCH_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_SEARCH_KEY not configured");
  const url = new URL(`${MAPS_BASE}/${path.replace(/^\/+/, "")}`);
  new URLSearchParams(search).forEach((v, k) => url.searchParams.set(k, v));
  url.searchParams.set("key", key);
  const res = await fetch(url, { headers: { "content-type": "application/json" } });
  const buf = await res.arrayBuffer();
  return { status: res.status, contentType: res.headers.get("content-type") ?? "application/json", body: buf, usage: { metric: "maps_calls", quantity: 1, units: "calls" } };
}

// ── Search (Programmable Search / Custom Search) — call-billed ────────────────
export async function forwardSearch(search: string): Promise<UpstreamResult> {
  const key = process.env.GOOGLE_MAPS_SEARCH_KEY;
  const cx = process.env.SEARCH_ENGINE_ID;
  if (!key) throw new Error("GOOGLE_MAPS_SEARCH_KEY not configured");
  if (!cx) return jsonResult(501, { error: "search not configured: SEARCH_ENGINE_ID (cx) missing" });
  const url = new URL(SEARCH_BASE);
  new URLSearchParams(search).forEach((v, k) => url.searchParams.set(k, v));
  url.searchParams.set("key", key);
  url.searchParams.set("cx", cx);
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return { status: res.status, contentType: "application/json", body: buf, usage: { metric: "search_calls", quantity: 1, units: "calls" } };
}

// ── Vertex AI — service-account auth, token-billed ───────────────────────────
let _auth: GoogleAuth | null = null;
async function vertexToken(): Promise<string> {
  if (!_auth) {
    const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
    if (!b64) throw new Error("GOOGLE_SERVICE_ACCOUNT_B64 not configured");
    const credentials = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    _auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  }
  const t = await _auth.getAccessToken();
  if (!t) throw new Error("failed to mint Vertex access token");
  return t;
}

export async function forwardVertex(path: string, method: string, body: ArrayBuffer | null): Promise<UpstreamResult> {
  const project = process.env.VERTEX_PROJECT_ID;
  const location = process.env.VERTEX_LOCATION ?? "us-central1";
  if (!project) throw new Error("VERTEX_PROJECT_ID not configured");
  const token = await vertexToken();
  // path is e.g. "publishers/google/models/gemini-2.5-flash:generateContent"
  const base = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}`;
  const res = await fetch(`${base}/${path.replace(/^\/+/, "")}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body && method !== "GET" ? body : undefined,
  });
  const buf = await res.arrayBuffer();
  let usage: UpstreamResult["usage"];
  try {
    const total = JSON.parse(new TextDecoder().decode(buf))?.usageMetadata?.totalTokenCount;
    if (typeof total === "number") usage = { metric: "vertex_tokens", quantity: total, units: "tokens" };
  } catch {}
  return { status: res.status, contentType: res.headers.get("content-type") ?? "application/json", body: buf, usage };
}

// ── Embeddings (text-embedding-004) — used by the vector store ───────────────
export async function embed(text: string): Promise<number[]> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY not configured");
  const res = await fetch(`${GEMINI_BASE}/v1beta/models/gemini-embedding-001:embedContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // 768-dim to match the pgvector column; gemini-embedding-001 defaults to 3072.
    body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: 768 }),
  });
  if (!res.ok) throw new Error(`embed failed: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { embedding?: { values?: number[] } };
  const values = j.embedding?.values;
  if (!values) throw new Error("embed: no values in response");
  return values;
}

export { jsonResult };
