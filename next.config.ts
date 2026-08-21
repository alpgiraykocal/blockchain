import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The actor-label snapshot is read from disk at runtime instead of being
  // imported, so it must be traced into the build output explicitly.
  outputFileTracingIncludes: {
    "/**": ["./data/actor-labels.json"],
  },
};

export default nextConfig;
