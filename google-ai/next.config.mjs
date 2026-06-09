/** @type {import('next').NextConfig} */
const nextConfig = {
  // The marketplace partner API + proxy are all server routes; nothing static to export.
  serverExternalPackages: ["@neondatabase/serverless"],
  // This app lives inside the `altro` monorepo; pin tracing root to this package so Next doesn't
  // walk up to a stray lockfile in $HOME.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
