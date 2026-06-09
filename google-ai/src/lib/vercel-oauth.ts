// Classic Vercel OAuth ("Connectable Account") integration flow — the self-serve interim while
// the native Marketplace partner application is in review. The user installs the integration,
// Vercel sends them to our callback with a code, we exchange it for an access token, then use that
// token to set the Gemini env vars on the projects they pick.

const TOKEN_URL = "https://api.vercel.com/v2/oauth/access_token";

export type OAuthToken = {
  access_token: string;
  token_type: string;
  installation_id: string;
  user_id: string;
  team_id: string | null;
};

export async function exchangeCode(code: string, redirectUri: string): Promise<OAuthToken> {
  const body = new URLSearchParams({
    client_id: process.env.VERCEL_OAUTH_CLIENT_ID!,
    client_secret: process.env.VERCEL_OAUTH_CLIENT_SECRET!,
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`oauth token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as OAuthToken;
}

export async function listProjects(token: string, teamId: string | null): Promise<{ id: string; name: string }[]> {
  const url = new URL("https://api.vercel.com/v9/projects");
  if (teamId) url.searchParams.set("teamId", teamId);
  url.searchParams.set("limit", "100");
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`list projects failed: ${res.status}`);
  const j = (await res.json()) as { projects?: { id: string; name: string }[] };
  return (j.projects ?? []).map((p) => ({ id: p.id, name: p.name }));
}

export async function setProjectEnv(
  token: string,
  teamId: string | null,
  projectId: string,
  key: string,
  value: string,
): Promise<void> {
  const url = new URL(`https://api.vercel.com/v10/projects/${projectId}/env`);
  if (teamId) url.searchParams.set("teamId", teamId);
  url.searchParams.set("upsert", "true");
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ key, value, type: "encrypted", target: ["production", "preview", "development"] }),
  });
  if (!res.ok) throw new Error(`set env ${key} on ${projectId} failed: ${res.status} ${await res.text()}`);
}
