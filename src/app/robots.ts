import type { MetadataRoute } from "next";

/** The API proxies rate-limited public explorers, so crawlers are kept to the
 *  rendered pages. Address and investigation routes are excluded too: they are
 *  one page per address, which is an unbounded crawl surface that would put
 *  every hit straight through to an upstream provider. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/investigate", "/explorer", "/tags"],
        disallow: ["/api/", "/address/", "/investigate/"],
      },
    ],
  };
}
