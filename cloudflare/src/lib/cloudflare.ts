// Upstream calls to Cloudflare, made with OUR account token. The proxy forwards the customer's
// request to the relevant subtree of the Cloudflare account API and meters it. Same shape as the
// Google integration: a metered gateway over a provider's API on our credentials.

const CF = "https://api.cloudflare.com/client/v4";

export type UpstreamResult = {
  status: number;
  contentType: string;
  body: ArrayBuffer;
  usage?: { metric: string; quantity: number; units: string };
};

function cfEnv() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) throw new Error("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN not configured");
  return { account, token };
}

// Generic forward to /accounts/{id}/<subtree>/<path>, metered per call.
async function cfForward(
  subtree: string,
  path: string,
  method: string,
  body: ArrayBuffer | null,
  metric: string,
): Promise<UpstreamResult> {
  const { account, token } = cfEnv();
  // Append the sub-path only when present — a trailing slash 404s several CF endpoints
  // (e.g. /d1/database/ vs /d1/database).
  const p = path.replace(/^\/+/, "");
  const url = p ? `${CF}/accounts/${account}/${subtree}/${p}` : `${CF}/accounts/${account}/${subtree}`;
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body && method !== "GET" ? { "content-type": "application/json" } : {}),
    },
    body: body && method !== "GET" ? body : undefined,
  });
  const buf = await res.arrayBuffer();
  return {
    status: res.status,
    contentType: res.headers.get("content-type") ?? "application/json",
    body: buf,
    usage: { metric, quantity: 1, units: "calls" },
  };
}

// ── Workers AI — POST /ai/run/<model> (e.g. @cf/meta/llama-3.1-8b-instruct) ──
export const forwardWorkersAI = (path: string, method: string, body: ArrayBuffer | null) =>
  cfForward("ai/run", path, method, body, "workers_ai_requests");

// ── KV — /storage/kv/namespaces/<ns>/values/<key>, /bulk, namespace mgmt ──────
export const forwardKV = (path: string, method: string, body: ArrayBuffer | null) =>
  cfForward("storage/kv/namespaces", path, method, body, "kv_ops");

// ── D1 — /d1/database/<id>/query, db management ──────────────────────────────
export const forwardD1 = (path: string, method: string, body: ArrayBuffer | null) =>
  cfForward("d1/database", path, method, body, "d1_queries");

// ── R2 — /r2/buckets/<name>/objects/<key>, bucket management ─────────────────
export const forwardR2 = (path: string, method: string, body: ArrayBuffer | null) =>
  cfForward("r2/buckets", path, method, body, "r2_ops");

// ── Turnstile — /challenges/widgets (widget management) ──────────────────────
export const forwardTurnstile = (path: string, method: string, body: ArrayBuffer | null) =>
  cfForward("challenges/widgets", path, method, body, "turnstile_ops");
