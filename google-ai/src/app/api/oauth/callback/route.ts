import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { exchangeCode } from "@/lib/vercel-oauth";

// Step 1 of the classic OAuth interim: Vercel redirects the user here after they install the
// integration. We exchange the code for an access token, store the installation, and send them to
// the /connect picker. Spec: GET /api/oauth/callback?code=...&teamId=...&next=...
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next");
  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  const base = process.env.APP_BASE_URL ?? req.nextUrl.origin;
  const tok = await exchangeCode(code, `${base}/api/oauth/callback`);

  await sql`
    insert into installations (id, account_name, access_token, scopes, updated_at)
    values (${tok.installation_id}, ${tok.team_id ?? null}, ${tok.access_token}, '[]'::jsonb, now())
    on conflict (id) do update set access_token = excluded.access_token, updated_at = now(), deleted_at = null
  `;

  const dest = new URL("/connect", base);
  dest.searchParams.set("inst", tok.installation_id);
  if (tok.team_id) dest.searchParams.set("team", tok.team_id);
  if (next) dest.searchParams.set("next", next);
  return NextResponse.redirect(dest);
}
