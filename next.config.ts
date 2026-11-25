import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Let an iPhone on the same Wi-Fi / hotspot use `npm run dev` via the Mac's network address.
  // Dev-only: this has no effect on production builds.
  allowedDevOrigins: ["*.local", "192.168.*.*", "172.*.*.*", "10.*.*.*"],
  turbopack: {
    // A stray package-lock.json in the home folder otherwise makes Next guess the wrong root.
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
