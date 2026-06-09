import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { issueKey } from "@/lib/keys";
import { PRODUCTS } from "@/lib/products";
import { setProjectEnv } from "@/lib/vercel-oauth";
import type { Installation } from "@/lib/db";

// Step 3 of the OAuth interim: issue one Gemini key for this installation and set
// GEMINI_API_KEY + GEMINI_BASE_URL on each selected project, then return the user to Vercel.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const inst = String(form.get("inst") ?? "");
  const team = form.get("team") ? String(form.get("team")) : null;
  const next = form.get("next") ? String(form.get("next")) : null;
  const projectIds = form.getAll("projectId").map(String).filter(Boolean);

  if (!inst || projectIds.length === 0) {
    return NextResponse.json({ error: "missing installation or no projects selected" }, { status: 400 });
  }

  const rows = (await sql`select access_token from installations where id = ${inst} and deleted_at is null limit 1`) as Pick<Installation, "access_token">[];
  if (rows.length === 0) return NextResponse.json({ error: "installation not found" }, { status: 404 });
  const userToken = rows[0].access_token;

  const base = process.env.APP_BASE_URL ?? req.nextUrl.origin;

  // Provision every enabled product: one resource + key each, and collect the env vars to inject.
  const enabled = Object.values(PRODUCTS).filter((p) => p.enabled);
  const envVars: { name: string; value: string }[] = [];
  for (const product of enabled) {
    const resourceId = `res_${randomBytes(12).toString("hex")}`;
    await sql`
      insert into resources (id, installation_id, product_id, name, status, billing_plan_id)
      values (${resourceId}, ${inst}, ${product.id}, ${`${product.name} (OAuth)`}, 'ready', ${`${product.id}-payg`})
    `;
    const key = issueKey(product.id);
    await sql`
      insert into api_keys (id, resource_id, key_prefix, key_hash)
      values (${`key_${randomBytes(8).toString("hex")}`}, ${resourceId}, ${key.prefix}, ${key.hash})
    `;
    envVars.push({ name: product.envKeyName, value: key.full });
    envVars.push({ name: product.envUrlName, value: `${base}/api/proxy/${product.id}` });
  }

  const failed: string[] = [];
  for (const pid of projectIds) {
    try {
      for (const ev of envVars) await setProjectEnv(userToken, team, pid, ev.name, ev.value);
    } catch {
      failed.push(pid);
    }
  }

  // Vercel expects us to return the user to `next` after configuration.
  if (next && failed.length === 0) {
    return NextResponse.redirect(next, { status: 303 });
  }
  const done = new URL("/connect/done", base);
  done.searchParams.set("set", String(projectIds.length - failed.length));
  if (failed.length) done.searchParams.set("failed", String(failed.length));
  if (next) done.searchParams.set("next", next);
  return NextResponse.redirect(done, { status: 303 });
}
