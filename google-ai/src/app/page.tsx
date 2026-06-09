export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "10vh auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: "1.6rem" }}>Google AI for Vercel</h1>
      <p style={{ color: "#555" }}>
        Provision Gemini, Maps, Search, Vertex AI and a vector DB straight into your Vercel project —
        metered and billed through your Vercel invoice. No Google Cloud account required.
      </p>
      <p style={{ color: "#999", fontSize: ".85rem", marginTop: "2rem" }}>
        Marketplace integration · status: scaffolding. Dashboard coming soon.
      </p>
    </main>
  );
}
