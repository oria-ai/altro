import { NextRequest } from "next/server";

// Verify that an inbound partner-API call (PUT /v1/installations/..., POST .../resources, /sso)
// genuinely originates from Vercel. Vercel signs requests for your integration; verification uses
// the integration's client secret.
//
// TODO(register): Vercel signs the raw request body with HMAC-SHA1 using your integration's
// client secret and sends it in `x-vercel-signature`. Implement the constant-time compare here
// once the integration is registered and VERCEL_INTEGRATION_CLIENT_SECRET is set. SSO requests
// instead carry a signed OIDC token (`?code=`/JWT) validated against Vercel's JWKS.
//
// Until registration, this is a permissive stub guarded by an env flag so local/dev tests run,
// but it FAILS CLOSED in production if the secret is configured.
export async function verifyVercelRequest(req: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.VERCEL_INTEGRATION_CLIENT_SECRET;
  if (!secret) {
    // Not yet registered — allow in non-production only.
    return process.env.NODE_ENV !== "production";
  }
  const signature = req.headers.get("x-vercel-signature");
  if (!signature) return false;

  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha1", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
