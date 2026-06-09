// The catalogue of products this single integration offers. Each maps a Vercel "product" to an
// upstream Google service, the metric we bill on, and the env var(s) we inject into the
// customer's project when they provision it. Start with Gemini; the rest are scaffolded so the
// metering/billing rail is identical when we turn them on.
export type ProductId = "gemini" | "maps" | "search" | "vertex" | "vectors";

export type ProductDef = {
  id: ProductId;
  name: string;
  metric: string; // usage_events.metric
  units: "tokens" | "calls" | "ops";
  // Env var prefix injected into the customer's project. The proxy base URL + the issued key.
  envKeyName: string; // e.g. GOOGLE_AI_API_KEY
  envUrlName: string; // e.g. GOOGLE_AI_BASE_URL
  enabled: boolean;
};

export const PRODUCTS: Record<ProductId, ProductDef> = {
  gemini: {
    id: "gemini",
    name: "Gemini",
    metric: "gemini_tokens",
    units: "tokens",
    envKeyName: "GEMINI_API_KEY",
    envUrlName: "GEMINI_BASE_URL",
    enabled: true,
  },
  maps: { id: "maps", name: "Maps", metric: "maps_calls", units: "calls", envKeyName: "MAPS_API_KEY", envUrlName: "MAPS_BASE_URL", enabled: true },
  search: { id: "search", name: "Search", metric: "search_calls", units: "calls", envKeyName: "SEARCH_API_KEY", envUrlName: "SEARCH_BASE_URL", enabled: true },
  vertex: { id: "vertex", name: "Vertex AI", metric: "vertex_tokens", units: "tokens", envKeyName: "VERTEX_API_KEY", envUrlName: "VERTEX_BASE_URL", enabled: true },
  vectors: { id: "vectors", name: "Vector DB", metric: "vector_ops", units: "ops", envKeyName: "VECTORS_API_KEY", envUrlName: "VECTORS_BASE_URL", enabled: true },
};

export function isProductId(x: string): x is ProductId {
  return x in PRODUCTS;
}
