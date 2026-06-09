import { NextRequest, NextResponse } from "next/server";
import { isProductId, PRODUCTS } from "@/lib/products";

// Vercel calls this to show the customer the billing plans available for a product before they
// provision it. Spec: GET /v1/installations/{installationId}/products/{productId}/plans
//
// We expose a single usage-based ("pay as you go") plan per product for the MVP. Real per-unit
// pricing is configured in the Integrations Console; the `cost`/`details` here are what the user
// sees in the provisioning dialog.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ productId: string }> }) {
  const { productId } = await ctx.params;
  if (!isProductId(productId)) {
    return NextResponse.json({ error: { code: "not_found", message: "unknown product" } }, { status: 404 });
  }
  const p = PRODUCTS[productId];

  return NextResponse.json({
    plans: [
      {
        id: `${productId}-payg`,
        type: "subscription",
        name: `${p.name} — Pay as you go`,
        scope: "resource",
        paymentMethodRequired: true,
        description: `Metered ${p.units}. Billed monthly through Vercel.`,
        details: [{ label: "Billing", value: `Per ${p.units === "tokens" ? "1M tokens" : "1k calls"}` }],
      },
    ],
  });
}
