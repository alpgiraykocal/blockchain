import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n/config";

/** The API proxies rate-limited public explorers, so crawlers are kept to the
 *  rendered pages. Address and investigation routes are excluded too: they are
 *  one page per address, which is an unbounded crawl surface that would put
 *  every hit straight through to an upstream provider. Both rules are written
 *  per locale, because every page now sits under a language prefix. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blockchain.alpgiraykocal.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", ...LOCALES.flatMap((l) => [`/${l}`, `/${l}/investigate`, `/${l}/explorer`, `/${l}/tags`])],
        disallow: [
          "/api/",
          ...LOCALES.flatMap((l) => [`/${l}/address/`, `/${l}/investigate/`]),
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
