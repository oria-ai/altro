export const dynamic = "force-dynamic";

export default async function Done({ searchParams }: { searchParams: Promise<{ set?: string; failed?: string; next?: string }> }) {
  const { set, failed, next } = await searchParams;
  return (
    <main style={{ maxWidth: 560, margin: "10vh auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: "1.4rem" }}>✓ Gemini connected</h1>
      <p style={{ color: "#555" }}>
        Set <code>GEMINI_API_KEY</code> + <code>GEMINI_BASE_URL</code> on <b>{set ?? "0"}</b> project(s).
        {failed && Number(failed) > 0 ? ` ${failed} failed — re-run to retry.` : ""}
      </p>
      <p style={{ color: "#555" }}>
        Point the Google Generative AI SDK at <code>GEMINI_BASE_URL</code> with <code>GEMINI_API_KEY</code> and you're live.
      </p>
      {next && (
        <p style={{ marginTop: "1.5rem" }}>
          <a href={next} style={{ color: "#06f" }}>← Back to Vercel</a>
        </p>
      )}
    </main>
  );
}
