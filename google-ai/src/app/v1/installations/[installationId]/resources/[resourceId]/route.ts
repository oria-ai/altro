import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyVercelRequest } from "@/lib/auth";
import type { Resource } from "@/lib/db";

// Read a single resource. Spec: GET /v1/installations/{installationId}/resources/{resourceId}
export async function GET(_req: NextRequest, ctx: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await ctx.params;
  const rows = (await sql`
    select id, installation_id, product_id, name, status, billing_plan_id
    from resources where id = ${resourceId} and deleted_at is null limit 1
  `) as Resource[];
  if (rows.length === 0) {
    return NextResponse.json({ error: { code: "not_found", message: "resource not found" } }, { status: 404 });
  }
  const r = rows[0];
  return NextResponse.json({ id: r.id, productId: r.product_id, name: r.name, status: r.status });
}

// Update (e.g. rename / plan change). Spec: PATCH .../resources/{resourceId}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await ctx.params;
  const raw = await req.text();
  if (!(await verifyVercelRequest(req, raw))) {
    return NextResponse.json({ error: { code: "forbidden", message: "bad signature" } }, { status: 403 });
  }
  const body = JSON.parse(raw || "{}");
  if (typeof body?.name === "string") {
    await sql`update resources set name = ${body.name} where id = ${resourceId}`;
  }
  if (typeof body?.billingPlanId === "string") {
    await sql`update resources set billing_plan_id = ${body.billingPlanId} where id = ${resourceId}`;
  }
  return new NextResponse(null, { status: 204 });
}

// Deprovision a single resource. Revokes its keys so the proxy stops serving immediately.
// Spec: DELETE .../resources/{resourceId}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await ctx.params;
  const raw = await req.text();
  if (!(await verifyVercelRequest(req, raw))) {
    return NextResponse.json({ error: { code: "forbidden", message: "bad signature" } }, { status: 403 });
  }
  await sql`update api_keys set revoked_at = now() where resource_id = ${resourceId} and revoked_at is null`;
  await sql`update resources set deleted_at = now(), status = 'suspended' where id = ${resourceId}`;
  return new NextResponse(null, { status: 204 });
}
