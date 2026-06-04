// PayPal REST client — zero deps, uses Node's built-in fetch.
// Credentials come from the environment (injected by `doppler run`):
//   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
// PAYPAL_ENV selects the host: "live" (default) or "sandbox".

const HOSTS = {
  live: "https://api-m.paypal.com",
  sandbox: "https://api-m.sandbox.paypal.com",
};

export function baseUrl() {
  const env = (process.env.PAYPAL_ENV || "live").toLowerCase();
  const host = HOSTS[env];
  if (!host) throw new Error(`PAYPAL_ENV must be "live" or "sandbox", got "${env}"`);
  return host;
}

function creds() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error(
      "Missing PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET. Run via:\n" +
        "  doppler run --project oria --config prd -- node bin/pp.mjs ..."
    );
  }
  return { id, secret };
}

// In-process token cache (expires a minute early to be safe).
let cached = null;

export async function token() {
  if (cached && cached.expires > Date.now()) return cached.value;
  const { id, secret } = creds();
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Auth failed (${res.status}): ${data.error_description || data.error || JSON.stringify(data)}`);
  }
  cached = {
    value: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000,
    scopes: (data.scope || "").split(" ").filter(Boolean),
  };
  return cached.value;
}

// Scopes granted to the current app (after a token fetch).
export async function scopes() {
  await token();
  return cached?.scopes || [];
}

// Generic authenticated request. Returns parsed JSON (or {} for empty bodies).
// Throws an Error carrying .status and .body on non-2xx.
export async function api(method, path, { body, headers } = {}) {
  const t = await token();
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(
      `${method} ${path} → ${res.status}: ${data.message || data.error_description || data.name || text}`
    );
    err.status = res.status;
    err.body = data;
    // PayPal returns 403 with issue NOT_AUTHORIZED / missing scope — surface a hint.
    if (res.status === 403) {
      err.hint = "This usually means the feature isn't enabled on the app (Dashboard → app → Features), or (for Payouts) not yet approved by PayPal.";
    }
    throw err;
  }
  return data;
}
