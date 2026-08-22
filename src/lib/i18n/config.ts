/**
 * Locale configuration.
 *
 * Kept free of React and of the dictionaries themselves so the middleware - which
 * runs on every request and must stay small - can import the detection logic
 * without pulling any translated copy into its bundle.
 */

export const LOCALES = ["tr", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * The fallback when nothing else decides.
 *
 * Detection prefers whatever the visitor's browser asks for, so this only
 * applies to clients that send no usable `Accept-Language` - crawlers, curl,
 * and monitors. English is the safer default for those.
 */
export const DEFAULT_LOCALE: Locale = "en";

/** Name of the cookie that remembers an explicit choice from the switcher. */
export const LOCALE_COOKIE = "locale";

/** A year: the choice is a preference, not a session detail. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Human-readable names, each written in its own language rather than in the
 *  language of the current page - a switcher that says "Turkish" to someone who
 *  only reads Turkish is not much of a switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
};

/** The `lang` attribute and `hreflang` value for each locale. */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  tr: "tr",
  en: "en",
};

/**
 * Best match for an `Accept-Language` header.
 *
 * Parses quality values properly rather than reading the first tag: a browser
 * sending `en;q=0.8, tr;q=0.9` prefers Turkish, and taking the first entry would
 * get that backwards. Matching is on the primary subtag, so `tr-TR` and `tr`
 * both resolve to Turkish.
 */
export function matchLocale(acceptLanguage: string | null | undefined): Locale | null {
  if (!acceptLanguage) return null;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      const quality = q === undefined ? 1 : Number.parseFloat(q);
      return {
        tag: (tag ?? "").trim().toLowerCase(),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((entry) => entry.tag && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    if (tag === "*") return null;
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
  }

  return null;
}

/** Splits a pathname into its locale prefix and the rest. */
export function splitLocale(pathname: string): { locale: Locale | null; rest: string } {
  const segments = pathname.split("/");
  const first = segments[1];
  if (isLocale(first)) {
    const rest = `/${segments.slice(2).join("/")}`;
    return { locale: first, rest: rest === "/" ? "/" : rest.replace(/\/$/, "") };
  }
  return { locale: null, rest: pathname };
}

/** Builds an in-app href for a locale. `path` is always the unprefixed route. */
export function localePath(locale: Locale, path: string): string {
  if (!path.startsWith("/")) return `/${locale}/${path}`;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
