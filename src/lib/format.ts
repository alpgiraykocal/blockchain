import type { ChainId, Value } from "./types";
import { CHAINS } from "./chains/registry";

export function makeValue(
  raw: bigint | string | number,
  chain: ChainId,
  priceUsd: number | null,
): Value {
  const big = typeof raw === "bigint" ? raw : BigInt(Math.trunc(Number(raw) || 0));
  const decimals = CHAINS[chain].decimals;
  const coin = Number(big) / 10 ** decimals;
  return {
    raw: big.toString(),
    coin,
    usd: priceUsd == null ? null : coin * priceUsd,
  };
}

export const ZERO_VALUE: Value = { raw: "0", coin: 0, usd: 0 };

export function formatCoin(value: Value, chain: ChainId, maxFrac = 8): string {
  const ticker = CHAINS[chain].ticker;
  const abs = Math.abs(value.coin);
  const frac = abs === 0 ? 2 : abs < 0.001 ? maxFrac : abs < 1 ? 6 : 4;
  return `${value.coin.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: frac,
  })} ${ticker}`;
}

export function formatUsd(usd: number | null, compact = false): string {
  if (usd == null) return "—";
  const abs = Math.abs(usd);
  const useCompact = compact && abs >= 10_000;
  return usd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    notation: useCompact ? "compact" : "standard",
    // Compact notation with zero fraction digits renders 1.45B and 1.02B both as
    // "$1B", so two very different figures read as identical. Keep two digits.
    maximumFractionDigits: useCompact ? 2 : abs >= 1000 ? 0 : 2,
    minimumFractionDigits: useCompact ? 0 : undefined,
  });
}

export function formatNumber(n: number | null | undefined, compact = false): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    notation: compact && Math.abs(n) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  });
}

/** Title-cases feed-supplied identifiers such as "bitwise" or "f2pool_io" that
 *  are meant to be read as a name. Strings that already carry capitals or dots
 *  (Huobi.com, BitMEX) are left exactly as published. */
export function displayName(value: string): string {
  if (!value) return value;
  if (/[A-Z.]/.test(value)) return value;
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

export function truncateAddress(address: string, head = 8, tail = 6): string {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/**
 * Dates and relative times are the one numeric surface that is really text -
 * month names and "3 days ago" are words - so they follow the active locale.
 *
 * Quantities deliberately do not. `formatCoin`, `formatUsd` and `formatNumber`
 * stay on en-US grouping in both languages because every figure here is meant
 * to be cross-checked against mempool.space or Blockscout, which render
 * `1,234.56`; switching the separators for one language would make the same
 * balance look different from the explorer it was read from.
 */
export function formatDate(iso: string | null, withTime = true, locale = "en"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale === "tr" ? "tr-TR" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatRelative(iso: string | null, locale = "en"): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [1000 * 60 * 60 * 24 * 365, "year"],
    [1000 * 60 * 60 * 24 * 30, "month"],
    [1000 * 60 * 60 * 24, "day"],
    [1000 * 60 * 60, "hour"],
    [1000 * 60, "minute"],
  ];
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [ms, unit] of units) {
    if (Math.abs(diff) >= ms) return rtf.format(-Math.round(diff / ms), unit);
  }
  return locale === "tr" ? "az önce" : "just now";
}

export function formatPercent(n: number | null, digits = 2): string {
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}
