import type { NextConfig } from "next";

/** Static headers. The Content-Security-Policy is not here: it carries a
 *  per-request nonce and is set in `src/middleware.ts`. */
const securityHeaders = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // The app needs no camera, microphone, geolocation or payment access.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // A single long-lived Node process suits this workload: the 10 MB label
  // snapshot is parsed once and the upstream cache is shared, where serverless
  // pays both costs per instance. `standalone` produces exactly that.
  output: "standalone",

  // The actor-label snapshot is read from disk at runtime instead of being
  // imported, so it must be traced into the build output explicitly.
  outputFileTracingIncludes: {
    "/**": ["./data/actor-labels.json.gz"],
  },

  poweredByHeader: false,

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Only `Vary` here, and deliberately so. A `Cache-Control` at this level
        // *replaces* whatever the route handler set rather than acting as a
        // default under it, so putting a blanket `no-store` here silently undid
        // the CDN caching that /api/stats, /api/address and /api/tags each ask
        // for. Cache policy stays with the route that knows its own data.
        //
        // The header this does carry is not a privacy control either: `Vary`
        // only tells a shared cache which request headers to key on.
        source: "/api/:path*",
        headers: [{ key: "Vary", value: "Accept-Encoding" }],
      },
    ];
  },
};

export default nextConfig;
