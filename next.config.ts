import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

// Uniform offline strategy across every Codevertex frontend (matches pos-ui/inventory-ui/etc):
// next-pwa is a webpack plugin and does not run under Turbopack, so its generated SW was either
// absent or stale depending on build mode. We own a static, hand-written service worker at
// public/sw.js instead (registered by the shared OfflineBar) — disabling here guarantees the
// build never overwrites it with a partial/missing generated one.
const withPWA = withPWAInit({
  dest: "public",
  disable: true,
  register: true,
});

const nextConfig: NextConfig = {
  ...(process.env.SKIP_STANDALONE !== 'true' && { output: 'standalone' as const }),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "booksapi.codevertexafrica.com",
      },
      {
        protocol: "https",
        hostname: "accounts.codevertexafrica.com",
      },
      {
        protocol: "https",
        hostname: "sso.codevertexafrica.com",
      },
    ],
  },
  turbopack: {},
};

export default withPWA(nextConfig);
