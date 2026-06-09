import { NextRequest, NextResponse } from "next/server";

// "Open in Provider" — when a customer clicks through from the Vercel dashboard into our product's
// own UI, Vercel sends them here with a signed OIDC `code` identifying the installation/user.
// Spec: GET /sso?code=...&state=...
//
// TODO(register): exchange `code` at Vercel's token endpoint using the integration client_id/secret
// to obtain the verified installation + user, then mint our own session and redirect into the
// dashboard. For now we land on a placeholder so the round-trip is wired.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }
  // Placeholder: redirect into our (not-yet-built) dashboard.
  return NextResponse.redirect(new URL("/?sso=ok", req.url));
}
