import type { MetadataRoute } from "next";

/** Only the stable entry points. Per-address routes are generated on demand
 *  from an unbounded key space and do not belong in a sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blockchain.alpgiraykocal.com";
  const now = new Date();
  return ["", "/investigate", "/explorer", "/tags"].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
}
