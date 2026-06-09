import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyVercelRequest } from "@/lib/auth";

// Vercel calls this when a customer installs (or updates) our integration. We persist the
// installation + the access_token we'll later use to report billing back to Vercel.
// Spec: PUT /v1/installations/{installationId}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ installationId: string }> }) {
  const { installationId } = await ctx.params;
  const raw = await req.text();
  if (!(await verifyVercelRequest(req, raw))) {
    return NextResponse.json({ error: { code: "forbidden", message: "bad signature" } }, { status: 403 });
  }

  const body = JSON.parse(raw || "{}");
  const accessToken: string | undefined = body?.credentials?.access_token;
  if (!accessToken) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "missing credentials.access_token" } },
      { status: 400 },
    );
  }

  await sql`
    insert into installations (id, account_name, contact_email, access_token, scopes, updated_at)
    values (
      ${installationId},
      ${body?.account?.name ?? null},
      ${body?.account?.contact?.email ?? null},
      ${accessToken},
      ${JSON.stringify(body?.scopes ?? [])}::jsonb,
      now()
    )
    on conflict (id) do update set
      account_name = excluded.account_name,
      contact_email = excluded.contact_email,
      access_token = excluded.access_token,
      scopes = excluded.scopes,
      updated_at = now(),
      deleted_at = null
  `;

  // Billing is per-resource here (no installation-level plan), so return 204.
  return new NextResponse(null, { status: 204 });
}

// Uninstall. Spec: DELETE /v1/installations/{installationId}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ installationId: string }> }) {
  const { installationId } = await ctx.params;
  const raw = await req.text();
  if (!(await verifyVercelRequest(req, raw))) {
    return NextResponse.json({ error: { code: "forbidden", message: "bad signature" } }, { status: 403 });
  }
  await sql`update installations set deleted_at = now() where id = ${installationId}`;
  await sql`update resources set deleted_at = now() where installation_id = ${installationId}`;
  return new NextResponse(null, { status: 204 });
}
