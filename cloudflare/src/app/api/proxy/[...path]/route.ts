import { NextRequest, NextResponse } from "next/server";
import { hashKey } from "@/lib/keys";
import { resolveKey, recordUsage } from "@/lib/meter";
import { forwardWorkersAI, forwardKV, forwardD1, forwardR2, forwardTurnstile, type UpstreamResult } from "@/lib/cloudflare";

// The product surface: the customer's project calls this with the scoped key we issued. We
// authenticate the key, forward to the right Cloudflare service with OUR account token, meter the
// usage, and return the response.
//   /api/proxy/<productId>/<cloudflare-api-path...>
export const runtime = "nodejs";

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const [productId, ...rest] = path;
  const upstreamPath = rest.join("/");

  // --- auth ---
  const auth = req.headers.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  const fullKey = bearer ?? req.headers.get("x-api-key") ?? req.nextUrl.searchParams.get("key");
  if (!fullKey) return NextResponse.json({ error: "missing api key" }, { status: 401 });
  const resolved = await resolveKey(hashKey(fullKey));
  if (!resolved || resolved.productId !== productId) return NextResponse.json({ error: "invalid api key" }, { status: 401 });

  const body = req.method === "GET" || req.method === "HEAD" ? null : await req.arrayBuffer();

  // --- dispatch per product ---
  let result: UpstreamResult;
  try {
    switch (productId) {
      case "workers-ai":
        result = await forwardWorkersAI(upstreamPath, req.method, body);
        break;
      case "kv":
        result = await forwardKV(upstreamPath, req.method, body);
        break;
      case "d1":
        result = await forwardD1(upstreamPath, req.method, body);
        break;
      case "r2":
        result = await forwardR2(upstreamPath, req.method, body);
        break;
      case "turnstile":
        result = await forwardTurnstile(upstreamPath, req.method, body);
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

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
