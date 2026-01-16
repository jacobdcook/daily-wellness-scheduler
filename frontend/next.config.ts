import type { NextConfig } from "next";
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development", // Disable PWA in development to avoid caching issues
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "http://localhost:8000/:path*", // Proxy to FastAPI backend
      },
    ];
  },
  // Configure Turbopack to work with webpack config from PWA plugin
  turbopack: {},
};

export default withPWA(nextConfig);
