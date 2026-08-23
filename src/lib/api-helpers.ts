import { NextResponse } from "next/server";
import { UpstreamError } from "./http";
import { getAdapter } from "./chains";
import { ASSETS, isAssetId, isValidAddress } from "./chains/registry";
import { isChainId } from "./chains/registry";
import { type Locale, isLocale } from "./i18n/config";
import { getDictionary } from "./i18n";
import type { AssetId, ChainId } from "./types";

export function jsonError(message: string, status: number, detail?: string) {
  return NextResponse.json({ error: message, detail }, { status });
}

export function parseChain(value: string | null): ChainId | null {
  if (!value || !isChainId(value)) return null;
  return value;
}

/**
 * The asset an analysis runs over.
 *
 * Absent means the chain's native coin, which keeps every existing caller
 * meaning what it always meant. A named asset has to belong to the chain that
 * was asked for: `?chain=btc&asset=usdt-eth` is a contradiction, not a default,
 * and answering it with Bitcoin figures under a USDT heading would be worse
 * than refusing.
 */
export function parseAsset(value: string | null, chain: ChainId): AssetId | null {
  if (!value) return chain;
  if (!isAssetId(value)) return null;
  return ASSETS[value].chain === chain ? value : null;
}

export function parseLimit(value: string | null, fallback = 50, max = 200): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

/** Internal to `resolveSubject`: routes should go through that, so raw input is
 *  never checked without the resolution step that follows it. */
function validateAddressParam(chain: ChainId, address: string | null) {
  if (!address) return "Missing `address` parameter.";
  if (!isValidAddress(chain, address)) {
    return `"${address}" is not a valid ${chain.toUpperCase()} address.`;
  }
  return null;
}

/**
 * Turns the caller's raw `address` parameter into a canonical address.
 *
 * The raw string is validated against the chain's own grammar *before* anything
 * upstream sees it, and the resolved result is validated again. Resolving first
 * and checking only the answer is what let a typo through: an explorer search
 * index answers a malformed query with its nearest fuzzy match, so `0xZZZ` came
 * back as a real, unrelated address and every panel then reported on it with
 * full confidence.
 */
export async function resolveSubject(
  chain: ChainId,
  raw: string | null,
): Promise<{ address: string; error: null } | { address: null; error: NextResponse }> {
  const invalid = validateAddressParam(chain, raw);
  if (invalid) return { address: null, error: jsonError(invalid, 400) };

  const resolved = await getAdapter(chain).resolve(raw!);
  if (!resolved || !isValidAddress(chain, resolved)) {
    return {
      address: null,
      error: jsonError(`"${raw}" did not resolve to a ${chain.toUpperCase()} address.`, 404),
    };
  }
  return { address: resolved, error: null };
}

/** Maps upstream explorer failures onto statuses the UI can act on. The message
 *  is rendered to a person, so it follows the locale the caller asked for. */
export function handleRouteError(error: unknown, locale: Locale = "en") {
  const t = getDictionary(locale).ui.errors;
  if (error instanceof UpstreamError) {
    if (error.status === 404) {
      return jsonError(t.notFound, 404, error.url);
    }
    if (error.status === 429) {
      return jsonError(t.rateLimited, 429, error.url);
    }
    // A 4xx from an explorer means it rejected what we asked for, which makes it
    // the caller's input rather than the explorer's failure. Reporting a
    // malformed address as "upstream explorer request failed" blames a service
    // that behaved correctly, and points whoever is debugging at the wrong end.
    if (error.status >= 400 && error.status < 500) {
      return jsonError(t.badUpstreamRequest, 400, error.message);
    }
    return jsonError(t.upstreamFailed, 502, error.message);
  }
  if (error instanceof Error && error.name === "AbortError") {
    return jsonError(t.timeout, 504);
  }
  const detail = error instanceof Error ? error.message : String(error);
  return jsonError(t.unexpected, 500, detail);
}

/**
 * Locale for a response body that contains prose.
 *
 * Several endpoints return risk signals, findings and a narrative that a person
 * reads, so the caller states which language it wants. An unknown or absent
 * value falls back to English rather than failing the request: a monitor that
 * omits the parameter should still get a usable answer.
 */
export function parseLocale(value: string | null): Locale {
  return isLocale(value) ? value : "en";
}
