import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
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
