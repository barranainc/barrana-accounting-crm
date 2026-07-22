import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      // Behind Render's proxy/CDN the forwarded host can differ from the request
      // Origin, which makes Next.js reject Server Actions with "An unexpected
      // response was received from the server". List every host the app is served
      // from so the actions are accepted. Extra entries can be added via the
      // ADDITIONAL_ALLOWED_ORIGINS env var (comma-separated).
      allowedOrigins: [
        "crm.barranaaccounting.ai",
        "barrana-accounting-crm-bl1f.onrender.com",
        "localhost:3000",
        ...(process.env.ADDITIONAL_ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
      ],
    },
  },
  images: {
    remotePatterns: [],
  },
  // TypeScript type-checking still runs during build; ESLint (pre-existing
  // <a>-vs-<Link> style rules on filter links) is run separately, not as a build gate.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
