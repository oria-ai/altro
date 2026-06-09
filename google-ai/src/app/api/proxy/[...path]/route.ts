import { NextRequest, NextResponse } from "next/server";
import { hashKey } from "@/lib/keys";
import { resolveKey, recordUsage } from "@/lib/meter";
import { forwardGemini, forwardMaps, forwardSearch, forwardVertex, jsonResult, type UpstreamResult } from "@/lib/google";
import { upsertVector, queryVectors } from "@/lib/vectors";

// The product surface: the customer's project calls this with the scoped key we issued. We
// authenticate the key, dispatch to the right Google service (or our pgvector store) with OUR
// credentials, meter the usage, and return the response.
//   /api/proxy/<productId>/<upstream-path...>
export const runtime = "nodejs";

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const [productId, ...rest] = path;
  const upstreamPath = rest.join("/");
  const search = req.nextUrl.search.replace(/^\?/, "");

  // --- auth ---
  const auth = req.headers.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  const fullKey = bearer ?? req.headers.get("x-goog-api-key") ?? req.nextUrl.searchParams.get("key");
  if (!fullKey) return NextResponse.json({ error: "missing api key" }, { status: 401 });
  const resolved = await resolveKey(hashKey(fullKey));
  if (!resolved || resolved.productId !== productId) return NextResponse.json({ error: "invalid api key" }, { status: 401 });

  const body = req.method === "GET" || req.method === "HEAD" ? null : await req.arrayBuffer();

  // --- dispatch per product ---
  let result: UpstreamResult;
  try {
    switch (productId) {
      case "gemini":
        result = await forwardGemini(upstreamPath, req.method, body);
        break;
      case "vertex":
        result = await forwardVertex(upstreamPath, req.method, body);
        break;
      case "maps":
        result = await forwardMaps(upstreamPath, search);
        break;
      case "search":
        result = await forwardSearch(search);
        break;
      case "vectors":
        result = await handleVectors(resolved.installationId, rest, body);
        break;
      default:
        return NextResponse.json({ error: `unknown product '${productId}'` }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  // --- meter ---
  if (result.usage) {
    await recordUsage({
      resourceId: resolved.resourceId,
      productId,
      metric: result.usage.metric,
      quantity: result.usage.quantity,
      units: result.usage.units,
    });
  }

  return new NextResponse(result.body, { status: result.status, headers: { "content-type": result.contentType } });
}

// Vector ops: /api/proxy/vectors/upsert  and  /api/proxy/vectors/query
async function handleVectors(installationId: string, rest: string[], body: ArrayBuffer | null): Promise<UpstreamResult> {
  const op = rest[0];
  const payload = body ? JSON.parse(new TextDecoder().decode(body)) : {};
  const namespace = String(payload.namespace ?? "default");
  if (op === "upsert") {
    if (!payload.id || typeof payload.content !== "string") return jsonResult(400, { error: "upsert requires { id, content }" });
    await upsertVector(installationId, namespace, String(payload.id), payload.content);
    return jsonResult(200, { ok: true, id: payload.id }, { metric: "vector_ops", quantity: 1, units: "ops" });
  }
  if (op === "query") {
    if (typeof payload.text !== "string") return jsonResult(400, { error: "query requires { text, k? }" });
    const k = Math.min(Number(payload.k ?? 5), 50);
    const matches = await queryVectors(installationId, namespace, payload.text, k);
    return jsonResult(200, { matches }, { metric: "vector_ops", quantity: 1, units: "ops" });
  }
  return jsonResult(404, { error: "vectors: use /upsert or /query" });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
