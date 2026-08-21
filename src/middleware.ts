import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-request CSP nonce.
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
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

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
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
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
