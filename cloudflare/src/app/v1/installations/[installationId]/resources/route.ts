import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { verifyVercelRequest } from "@/lib/auth";
import { isProductId, PRODUCTS } from "@/lib/products";
import { issueKey } from "@/lib/keys";

// Vercel calls this when a customer provisions a product instance. We mint a resource, issue a
// scoped API key, and return `secrets` — these become env vars in the customer's Vercel project.
// Spec: POST /v1/installations/{installationId}/resources
export async function POST(req: NextRequest, ctx: { params: Promise<{ installationId: string }> }) {
  const { installationId } = await ctx.params;
  const raw = await req.text();
  if (!(await verifyVercelRequest(req, raw))) {
    return NextResponse.json({ error: { code: "forbidden", message: "bad signature" } }, { status: 403 });
  }

  const body = JSON.parse(raw || "{}");
  const productId: string = body?.productId;
  if (!isProductId(productId) || !PRODUCTS[productId].enabled) {
    return NextResponse.json(
      { error: { code: "validation_error", message: `product '${productId}' not available` } },
      { status: 400 },
    );
  }
  const product = PRODUCTS[productId];

  const resourceId = `res_${randomBytes(12).toString("hex")}`;
  const name: string = body?.name ?? `${product.name} resource`;
  const billingPlanId: string | null = body?.billingPlanId ?? `${productId}-payg`;

  await sql`
    insert into resources (id, installation_id, product_id, name, status, billing_plan_id)
    values (${resourceId}, ${installationId}, ${productId}, ${name}, 'ready', ${billingPlanId})
  `;

  const key = issueKey(productId);
  await sql`
    insert into api_keys (id, resource_id, key_prefix, key_hash)
    values (${`key_${randomBytes(8).toString("hex")}`}, ${resourceId}, ${key.prefix}, ${key.hash})
  `;

  const baseUrl = process.env.APP_BASE_URL ?? "";

  // The shape Vercel expects back: the resource + the secrets to inject into the project.
  return NextResponse.json(
    {
      id: resourceId,
      productId,
      name,
      status: "ready",
      secrets: [
        { name: product.envKeyName, value: key.full },
        { name: product.envUrlName, value: `${baseUrl}/api/proxy/${productId}` },
      ],
    },
    { status: 201 },
  );
}
