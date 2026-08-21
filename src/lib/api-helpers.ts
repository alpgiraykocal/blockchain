import { NextResponse } from "next/server";
import { UpstreamError } from "./http";
import { isChainId, isValidAddress } from "./chains/registry";
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

/** Maps upstream explorer failures onto statuses the UI can act on. */
export function handleRouteError(error: unknown) {
  if (error instanceof UpstreamError) {
    if (error.status === 404) {
      return jsonError("Not found on the upstream explorer.", 404, error.url);
    }
    if (error.status === 429) {
      return jsonError(
        "Upstream rate limit reached. Wait a few seconds and retry.",
        429,
        error.url,
      );
    }
    return jsonError("Upstream explorer request failed.", 502, error.message);
  }
  if (error instanceof Error && error.name === "AbortError") {
    return jsonError("Upstream request timed out.", 504);
  }
  const detail = error instanceof Error ? error.message : String(error);
  return jsonError("Unexpected server error.", 500, detail);
}
