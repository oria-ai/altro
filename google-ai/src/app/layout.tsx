export const metadata = {
  title: "Google AI for Vercel",
  description: "Gemini, Maps, Search, Vertex and vector DB — provisioned and metered through Vercel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>{children}</body>
    </html>
  );
}
