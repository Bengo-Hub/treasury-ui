import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // The service worker must NEVER serve API responses from cache — otherwise a GET
    // refetched right after a mutation (e.g. updating an equity holder) returns a stale
    // cached body and the change appears "not picked" in production. Force all API traffic
    // (treasury-api / auth-api hosts and any /api/ path) to go straight to the network.
    runtimeCaching: [
      {
        urlPattern: ({ url }: { url: URL }) =>
          url.pathname.includes('/api/') ||
          /(booksapi|sso|accounts)\.codevertexitsolutions\.com$/.test(url.hostname),
        handler: 'NetworkOnly' as const,
      },
    ],
  },
});

const nextConfig: NextConfig = {
  ...(process.env.SKIP_STANDALONE !== 'true' && { output: 'standalone' as const }),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "booksapi.codevertexitsolutions.com",
      },
      {
        protocol: "https",
        hostname: "accounts.codevertexitsolutions.com",
      },
      {
        protocol: "https",
        hostname: "sso.codevertexitsolutions.com",
      },
    ],
  },
  turbopack: {},
};

export default withPWA(nextConfig);
