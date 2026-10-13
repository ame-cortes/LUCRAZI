import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    inlineCss: true,
  },
  images: {
    qualities: [55, 65, 75],
  },
  serverExternalPackages: ["firebase-admin"],
  outputFileTracingIncludes: {
    "/api/ebook": ["./assets/ebooks/como-faturar-seus-primeiros-1000-na-internet.pdf"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
