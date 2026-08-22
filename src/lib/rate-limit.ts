import { NextResponse, type NextRequest } from "next/server";
import { getDictionary } from "./i18n";
import { isLocale } from "./i18n/config";

/**
 * Per-client rate limiting for the API surface.
 *
 * Every route here proxies a free public block explorer. Published on the open
 * internet without a limit, all of that traffic reaches mempool.space and
 * Blockscout from one address, and a crawler or a scraper gets this deployment
 * blocked - which is a courtesy problem before it is an availability one.
 *
 * Deliberately in-process: a shared store would need infrastructure this app
 * does not otherwise require. On a single long-lived Node instance the limit is
 * exact; spread across serverless instances it is proportionally looser, which
 * is stated rather than assumed.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_CLIENTS = 5_000;

export interface RateLimitRule {
  /** Requests allowed inside the window. */
  limit: number;
  windowMs: number;
}

/** Assessment and graph expansion fan out to several upstream calls each, so
 *  they get a tighter allowance than a single lookup. */
export const RATE_LIMITS = {
  lookup: { limit: 60, windowMs: 60_000 },
  expensive: { limit: 20, windowMs: 60_000 },
  cheap: { limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitRule>;

/** Best-effort client identity. Behind Cloudflare the connecting IP arrives in
 *  `cf-connecting-ip`; behind another proxy, in `x-forwarded-for`. */
function clientKey(request: NextRequest): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    (forwarded ? forwarded.split(",")[0]!.trim() : null) ??
    "unknown"
  );
}

function sweep(now: number): void {
  if (buckets.size <= MAX_TRACKED_CLIENTS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Still oversized after dropping expired entries: shed the oldest so a flood
  // of unique clients cannot grow this map without bound.
  while (buckets.size > MAX_TRACKED_CLIENTS) {
    const oldest = buckets.keys().next();
    if (oldest.done) break;
    buckets.delete(oldest.value);
  }
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  request: NextRequest,
  rule: RateLimitRule,
  scope: string,
): RateLimitResult {
  const now = Date.now();
  const key = `${scope}:${clientKey(request)}`;

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + rule.windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  sweep(now);

  return {
    ok: bucket.count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "ratelimit-limit": String(result.limit),
    "ratelimit-remaining": String(result.remaining),
    "ratelimit-reset": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
  };
}

/** Returns a 429 when the caller is over the limit, or null to continue. */
export function enforceRateLimit(
  request: NextRequest,
  rule: RateLimitRule,
  scope: string,
): NextResponse | null {
  const result = checkRateLimit(request, rule, scope);
  if (result.ok) return null;

  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  const asked = request.nextUrl.searchParams.get("locale");
  const t = getDictionary(isLocale(asked) ? asked : "en").ui.errors;
  return NextResponse.json(
    {
      error: t.rateLimitTitle,
      detail: t.rateLimitDetail(rule.limit, retryAfter),
    },
    {
      status: 429,
      headers: { ...rateLimitHeaders(result), "retry-after": String(retryAfter) },
    },
  );
}
