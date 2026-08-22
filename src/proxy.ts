import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
  isLocale,
  localePath,
  matchLocale,
  splitLocale,
} from "@/lib/i18n/config";

/**
 * Per-request CSP nonce, and locale resolution.
 *
 * Named `proxy` and living in `src/proxy.ts`: Next 16 renamed this file
 * convention, and the old `middleware` name builds with a deprecation warning
 * rather than silently continuing to work forever.
 *
 * Next emits inline bootstrap and flight-data scripts on every page, so a policy
 * of `script-src 'self'` blocks the app's own hydration and ships a site that
 * renders and then does nothing. The two ways out are `'unsafe-inline'`, which
 * makes the script directive decorative, or a nonce.
 *
 * This takes the nonce. The cost is that pages render per request rather than
 * being prerendered, which is a fair trade here: the expensive work lives in the
 * API routes and their caches, not in rendering the shell. `strict-dynamic` lets
 * the nonced bootstrap load the chunks it needs without enumerating them.
 */

/** Paths that carry no locale: API routes and the crawler-facing metadata files
 *  are single-language by nature and must keep their canonical URLs. */
function isLocaleExempt(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico"
  );
}

/** Cookie first - an explicit choice from the switcher outranks the browser's
 *  header, otherwise picking Turkish once would be undone on the next request. */
function detectLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  return matchLocale(request.headers.get("accept-language")) ?? DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isLocaleExempt(pathname)) {
    const { locale } = splitLocale(pathname);

    if (!locale) {
      // No locale in the URL: send the visitor to the one that fits them. A
      // redirect rather than a rewrite, so the address bar shows the language
      // actually being served and the link stays shareable.
      const target = request.nextUrl.clone();
      target.pathname = localePath(detectLocale(request), pathname);
      const redirect = NextResponse.redirect(target);
      // Two visitors with different Accept-Language must not share a cached
      // redirect from an edge or proxy in front of this app.
      redirect.headers.set("Vary", "Accept-Language, Cookie");
      return redirect;
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // React's development build uses `eval` to rebuild stack traces across the
  // server/client boundary, so a dev page under the production policy fills the
  // console with CSP violations. This is scoped to `next dev` and never widens
  // what is served to a visitor - `NODE_ENV` is `production` in every build.
  const scriptExtras = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    // Next injects styles inline; there is no nonce path for those.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    // The browser never calls an explorer directly - every upstream request goes
    // through this app's own API routes.
    "connect-src 'self'",
    "worker-src 'self' blob:",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${scriptExtras}`,
    "upgrade-insecure-requests",
  ].join("; ");

  const headers = new Headers(request.headers);
  // Next extracts the nonce from the policy on the forwarded *request* headers -
  // not from a custom header - and stamps it onto every script it emits. Setting
  // only the response header produces a valid-looking policy that blocks the
  // app's own hydration.
  headers.set("Content-Security-Policy", csp);
  headers.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);

  // Keep the cookie in step with the URL, so a visitor who edits the path or
  // follows a shared /tr link keeps that language on their next visit.
  if (!isLocaleExempt(pathname)) {
    const { locale } = splitLocale(pathname);
    if (locale && request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
      response.cookies.set(LOCALE_COOKIE, locale, {
        path: "/",
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, which are immutable, already
     * fingerprinted, and gain nothing from a per-request policy.
     */
    {
      source: "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
