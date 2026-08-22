import type { NeighborRow } from "../analysis";
import { makeValue } from "../format";
import type { ChainId, Transaction } from "../types";
import type { EgoMetrics } from "./types";

/**
 * Explainable ego-network metrics.
 *
 * Every figure here is a count, a ratio or a median that an analyst can
 * re-derive by hand from the same transaction window. Nothing is learned, fitted
 * or weighted by a model — a metric that cannot be explained in one sentence
 * cannot be defended in a case file.
 */

const HOUR_MS = 3_600_000;

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Median hours from an inbound transaction to the next outbound one. Short
 *  dwell with high turnover is the shape of a pass-through account; it is also
 *  the shape of an exchange hot wallet, which is why attribution is read
 *  alongside it rather than after it. */
function medianDwell(transactions: Transaction[]): number | null {
  const timed = transactions
    .filter((tx) => tx.timestamp && tx.direction && tx.direction !== "self")
    .map((tx) => ({ at: new Date(tx.timestamp!).getTime(), dir: tx.direction! }))
    .filter((tx) => Number.isFinite(tx.at))
    .sort((a, b) => a.at - b.at);

  const gaps: number[] = [];
  let pendingInflow: number | null = null;
  for (const tx of timed) {
    if (tx.dir === "in") {
      if (pendingInflow === null) pendingInflow = tx.at;
    } else if (pendingInflow !== null) {
      gaps.push((tx.at - pendingInflow) / HOUR_MS);
      pendingInflow = null;
    }
  }
  return median(gaps);
}

/** Busiest day's transaction count against the mean across active days. A value
 *  near 1 is even activity; a high value means the window is dominated by a
 *  single day, which is what a burst looks like. */
function burstScore(transactions: Transaction[]): number {
  const perDay = new Map<string, number>();
  for (const tx of transactions) {
    if (!tx.timestamp) continue;
    const key = dayKey(tx.timestamp);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  if (perDay.size <= 1) return perDay.size === 1 ? 1 : 0;
  const counts = [...perDay.values()];
  const mean = counts.reduce((sum, n) => sum + n, 0) / counts.length;
  return mean === 0 ? 0 : Math.max(...counts) / mean;
}

export interface MetricsInput {
  chain: ChainId;
  transactions: Transaction[];
  neighbors: NeighborRow[];
  priceUsd: number | null;
  totalReceivedRaw: bigint;
  totalSentRaw: bigint;
}

export function computeMetrics(input: MetricsInput): EgoMetrics {
  const { chain, transactions, neighbors, priceUsd } = input;

  const inbound = neighbors.filter((row) => row.direction === "in");
  const outbound = neighbors.filter((row) => row.direction === "out");
  const degree = neighbors.length;

  const inRaw = inbound.reduce((sum, row) => sum + BigInt(row.link.value.raw), 0n);
  const outRaw = outbound.reduce((sum, row) => sum + BigInt(row.link.value.raw), 0n);

  const timestamps = transactions
    .map((tx) => tx.timestamp)
    .filter((value): value is string => Boolean(value))
    .sort();

  const activeDays = new Set(timestamps.map(dayKey)).size;

  const oneShot = neighbors.filter((row) => row.link.txCount === 1).length;

  const totalObserved = inRaw + outRaw;
  const largest = neighbors.reduce(
    (max, row) => (BigInt(row.link.value.raw) > max ? BigInt(row.link.value.raw) : max),
    0n,
  );

  const attributed = neighbors.filter((row) => row.node.tags.length > 0).length;

  /*
   * Proximity to attributed risk.
   *
   * Two things count. An abuse tag is the obvious one. The second is a mixer
   * category, and it has to be named explicitly: of the label sources loaded
   * here only OFAC ever sets an abuse value, so a definition of "risky" written
   * as `abuse !== "none"` alone would silently pass over the ~37k addresses the
   * feeds categorise as mixers - which is precisely the layering exposure an
   * analyst opens this page to see.
   *
   * Nothing else qualifies. An exchange or a token contract is a category, not a
   * concern, and gambling is higher-risk without being illicit - the codebase
   * already treats all three as services rather than risk.
   */
  const risky = neighbors.filter((row) =>
    row.node.tags.some((tag) => tag.abuse !== "none" || tag.category === "mixer"),
  );
  const riskyRaw = risky.reduce((sum, row) => sum + BigInt(row.link.value.raw), 0n);
  const services = neighbors.filter((row) =>
    row.node.tags.some((tag) =>
      ["exchange", "mining-pool", "token", "defi", "bridge", "wallet-service"].includes(
        tag.category,
      ),
    ),
  ).length;

  // Pass-through is measured on lifetime totals where the explorer supplies
  // them, because a window slice can make any address look like it retained
  // everything simply by ending mid-flow.
  const received = input.totalReceivedRaw;
  const sent = input.totalSentRaw;
  const passThroughRatio =
    received > 0n ? Math.min(1, Number((sent * 10_000n) / received) / 10_000) : 0;

  return {
    degree,
    inDegree: inbound.length,
    outDegree: outbound.length,
    inVolume: makeValue(inRaw, chain, priceUsd),
    outVolume: makeValue(outRaw, chain, priceUsd),
    fanInRatio: degree ? inbound.length / degree : 0,
    fanOutRatio: degree ? outbound.length / degree : 0,
    passThroughRatio,
    medianDwellHours: medianDwell(transactions),
    oneShotRatio: degree ? oneShot / degree : 0,
    concentration:
      totalObserved > 0n ? Number((largest * 10_000n) / totalObserved) / 10_000 : 0,
    burstScore: burstScore(transactions),
    attributedRatio: degree ? attributed / degree : 0,
    serviceCounterparties: services,
    riskyCounterparties: risky.length,
    riskyValueShare:
      totalObserved > 0n ? Number((riskyRaw * 10_000n) / totalObserved) / 10_000 : 0,
    activeDays,
    firstSeen: timestamps[0] ?? null,
    lastSeen: timestamps[timestamps.length - 1] ?? null,
  };
}

/** Formats a ratio as a percentage for narrative and UI use. */
export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}
