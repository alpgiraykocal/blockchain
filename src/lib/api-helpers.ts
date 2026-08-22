import { NextResponse } from "next/server";
import { UpstreamError } from "./http";
import { isChainId, isValidAddress } from "./chains/registry";
import { type Locale, isLocale } from "./i18n/config";
import { getDictionary } from "./i18n";
import type { ChainId } from "./types";

export function jsonError(message: string, status: number, detail?: string) {
  return NextResponse.json({ error: message, detail }, { status });
}

export function parseChain(value: string | null): ChainId | null {
  if (!value || !isChainId(value)) return null;
  return value;
}

export function parseLimit(value: string | null, fallback = 50, max = 200): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export function validateAddressParam(chain: ChainId, address: string | null) {
  if (!address) return "Missing `address` parameter.";
  if (!isValidAddress(chain, address)) {
    return `"${address}" is not a valid ${chain.toUpperCase()} address.`;
  }
  return null;
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
