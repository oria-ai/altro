import { sql } from "@/lib/db";
import { listProjects } from "@/lib/vercel-oauth";
import type { Installation } from "@/lib/db";

// Step 2 of the OAuth interim: the project picker. We load the installation's token, list the
// user's projects, and let them choose which ones get the Gemini env vars. The form posts to
// /api/connect which issues the key and sets the vars.
export const dynamic = "force-dynamic";

export default async function Connect({
  searchParams,
}: {
  searchParams: Promise<{ inst?: string; team?: string; next?: string }>;
}) {
  const { inst, team, next } = await searchParams;

  let projects: { id: string; name: string }[] = [];
  let error: string | null = null;

  if (!inst) {
    error = "Missing installation — start from the Vercel integration install flow.";
  } else {
    const rows = (await sql`select access_token from installations where id = ${inst} and deleted_at is null limit 1`) as Pick<Installation, "access_token">[];
    if (rows.length === 0) {
      error = "Installation not found.";
    } else {
      try {
        projects = await listProjects(rows[0].access_token, team ?? null);
      } catch (e) {
        error = `Couldn't list projects: ${(e as Error).message}`;
      }
    }
  }

  const wrap = { maxWidth: 560, margin: "8vh auto", padding: "0 1.5rem", lineHeight: 1.6 } as const;

  if (error) {
    return (
      <main style={wrap}>
        <h1 style={{ fontSize: "1.4rem" }}>Connect Gemini</h1>
        <p style={{ color: "#c0392b" }}>{error}</p>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: "1.4rem" }}>Connect Gemini to your projects</h1>
      <p style={{ color: "#555" }}>
        Pick the projects that should get <code>GEMINI_API_KEY</code> and <code>GEMINI_BASE_URL</code>.
        Calls run through our metered proxy — no Google account needed.
      </p>
      <form method="post" action="/api/connect">
        <input type="hidden" name="inst" value={inst} />
        {team && <input type="hidden" name="team" value={team} />}
        {next && <input type="hidden" name="next" value={next} />}
        <div style={{ display: "flex", flexDirection: "column", gap: ".4rem", margin: "1.2rem 0" }}>
          {projects.length === 0 && <p style={{ color: "#999" }}>No projects found on this account.</p>}
          {projects.map((p) => (
            <label key={p.id} style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
              <input type="checkbox" name="projectId" value={p.id} defaultChecked />
              {p.name}
            </label>
          ))}
        </div>
        <button
          type="submit"
          style={{ background: "#000", color: "#fff", border: 0, borderRadius: 6, padding: ".6rem 1.1rem", cursor: "pointer" }}
        >
          Connect selected
        </button>
      </form>
    </main>
  );
}
