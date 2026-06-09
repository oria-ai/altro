export const metadata = {
  title: "Cloudflare for Vercel",
  description: "Workers AI, KV, D1, R2 and Turnstile — provisioned and metered through Vercel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>{children}</body>
    </html>
  );
}
