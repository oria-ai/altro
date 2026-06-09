// The catalogue of Cloudflare products this integration resells. Each maps a Vercel "product" to a
// subtree of the Cloudflare account API, the metric we bill on, and the env vars injected into the
// customer's project (a scoped key + the proxy base URL for that product).
export type ProductId = "workers-ai" | "kv" | "d1" | "r2" | "turnstile";

export type ProductDef = {
  id: ProductId;
  name: string;
  metric: string;
  units: "calls" | "tokens" | "ops";
  envKeyName: string;
  envUrlName: string;
  enabled: boolean;
};

export const PRODUCTS: Record<ProductId, ProductDef> = {
  "workers-ai": { id: "workers-ai", name: "Workers AI", metric: "workers_ai_requests", units: "calls", envKeyName: "CF_AI_API_KEY", envUrlName: "CF_AI_BASE_URL", enabled: true },
  kv: { id: "kv", name: "Workers KV", metric: "kv_ops", units: "calls", envKeyName: "CF_KV_API_KEY", envUrlName: "CF_KV_BASE_URL", enabled: true },
  d1: { id: "d1", name: "D1", metric: "d1_queries", units: "calls", envKeyName: "CF_D1_API_KEY", envUrlName: "CF_D1_BASE_URL", enabled: true },
  r2: { id: "r2", name: "R2 Storage", metric: "r2_ops", units: "calls", envKeyName: "CF_R2_API_KEY", envUrlName: "CF_R2_BASE_URL", enabled: true },
  turnstile: { id: "turnstile", name: "Turnstile", metric: "turnstile_ops", units: "calls", envKeyName: "CF_TURNSTILE_API_KEY", envUrlName: "CF_TURNSTILE_BASE_URL", enabled: true },
};

export function isProductId(x: string): x is ProductId {
  return x in PRODUCTS;
}
