import type { MetadataRoute } from "next";
import { LOCALES, LOCALE_HTML_LANG, localePath } from "@/lib/i18n/config";

/**
 * Only the stable entry points, once per language.
 *
 * Per-address routes are generated on demand from an unbounded key space and do
 * not belong in a sitemap. Each entry advertises its translations through
 * `alternates`, so a crawler treats `/tr/tags` and `/en/tags` as one page in two
 * languages rather than as duplicates competing with each other.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blockchain.alpgiraykocal.com";
  const now = new Date();
  const paths = ["", "/investigate", "/explorer", "/tags"];

  return LOCALES.flatMap((locale) =>
    paths.map((path) => ({
      url: `${base}${localePath(locale, path || "/")}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((code) => [
            LOCALE_HTML_LANG[code],
            `${base}${localePath(code, path || "/")}`,
          ]),
        ),
      },
    })),
  );
}
