import { analyzeAddress, nodeId, type AddressAnalysis, type NeighborRow } from "../analysis";
import { CHAINS } from "../chains/registry";
import { makeValue } from "../format";
import { levelFor } from "../risk";
import type { ChainId, RiskLevel } from "../types";
import type { AmlCopy } from "./copy";
import { computeMetrics } from "./metrics";
import type {
  EgoEdge,
  EgoFilters,
  EgoNetwork,
  EgoNode,
  EgoTimeWindow,
  ReductionStep,
} from "./types";

/**
 * Ego-network extraction.
 *
 * The investigation view renders the local network around one subject, never a
 * whole-graph view. Reduction runs in a fixed order and every step it takes is
 * reported, because a rendered graph that silently hid half its edges is worse
 * than no graph at all.
 *
 * The published defaults for this pattern assume a graph database. Here the data
 * source is a public block explorer with per-address latency measured in seconds,
 * so the second hop expands a bounded top-K of the first ring rather than all of
 * it. That is a real limit on completeness and is recorded as one.
 */

export const LAYOUT_VERSION = "radial-v1";
export const ENGINE_VERSION = "aml-1.0.0";

export const DEFAULT_FILTERS: EgoFilters = {
  hopDepth: 1,
  maxNodes: 300,
  maxEdges: 1_000,
  topK: 12,
  minValueCoin: 0,
  direction: "both",
  suppressServiceHubs: true,
};

/** Second-hop fan-out. Each expansion is one explorer round trip, so this stays
 *  small by default and is the first thing an analyst raises deliberately. */
const HOP2_EXPANSION_CAP = 8;
const HOP2_CONCURRENCY = 4;

const SERVICE_CATEGORIES = new Set([
  "exchange",
  "mining-pool",
  "token",
  "defi",
  "bridge",
  "wallet-service",
]);

function isServiceHub(row: NeighborRow): boolean {
  return row.node.tags.some((tag) => SERVICE_CATEGORIES.has(tag.category));
}

/** Composite of risk, value share and recency, in that order of weight. It ranks
 *  a queue; it does not score suspicion. */
function priorityOf(row: NeighborRow, maxValueRaw: bigint, now: number): number {
  const risk = row.node.riskScore / 100;

  const raw = BigInt(row.link.value.raw);
  const valueShare =
    maxValueRaw > 0n ? Number((raw * 10_000n) / maxValueRaw) / 10_000 : 0;

  const last = row.link.lastSeen ? new Date(row.link.lastSeen).getTime() : null;
  const ageDays = last ? Math.max(0, (now - last) / 86_400_000) : 3650;
  const recency = Math.max(0, 1 - ageDays / 365);

  return Math.round((risk * 0.5 + valueShare * 0.3 + recency * 0.2) * 100);
}

function toEgoNode(
  row: NeighborRow,
  ring: number,
  priority: number,
  expandable: boolean,
): EgoNode {
  return {
    id: row.node.id,
    chain: row.node.chain,
    address: row.node.address,
    label: row.node.label,
    ring,
    ringIndex: 0,
    kind: row.node.kind,
    riskScore: row.node.riskScore,
    riskLevel: levelFor(row.node.riskScore),
    tags: row.node.tags,
    priority,
    isServiceHub: isServiceHub(row),
    txCount: row.link.txCount,
    value: row.link.value,
    direction: row.direction,
    expandable,
  };
}

function withinWindow(
  row: NeighborRow,
  window: { startMs: number | null; endMs: number | null },
): boolean {
  if (window.startMs === null && window.endMs === null) return true;
  const last = row.link.lastSeen ? new Date(row.link.lastSeen).getTime() : null;
  const first = row.link.firstSeen ? new Date(row.link.firstSeen).getTime() : null;
  if (last === null && first === null) return false;
  if (window.startMs !== null && (last ?? first)! < window.startMs) return false;
  if (window.endMs !== null && (first ?? last)! > window.endMs) return false;
  return true;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

export interface ExtractOptions extends Partial<EgoFilters> {
  windowStart?: string | null;
  windowEnd?: string | null;
  /** Reuse an analysis the caller already fetched. */
  seed?: AddressAnalysis;
  /** Copy for the risk signals the underlying analysis produces. */
  copy?: AmlCopy;
}

export interface ExtractResult {
  network: EgoNetwork;
  analysis: AddressAnalysis;
  /** Cluster members a second hop looped back to, for the round-tripping test. */
  returnPaths: { via: string; back: string }[];
}

export async function extractEgoNetwork(
  chain: ChainId,
  address: string,
  options: ExtractOptions = {},
): Promise<ExtractResult> {
  const filters: EgoFilters = { ...DEFAULT_FILTERS, ...options };
  const reduction: ReductionStep[] = [];
  const now = Date.now();

  const analysis = options.seed ?? (await analyzeAddress(chain, address, 50, options.copy));
  const centreId = nodeId(chain, analysis.address.address);

  const window: EgoTimeWindow = {
    start: options.windowStart ?? null,
    end: options.windowEnd ?? null,
    // The explorer already truncates history to a page; anything the analyst
    // sets narrows that slice further, it never widens it.
    boundedBySource: true,
  };
  const windowMs = {
    startMs: window.start ? new Date(window.start).getTime() : null,
    endMs: window.end ? new Date(window.end).getTime() : null,
  };

  /* --- reduction, in the order the pattern prescribes --------------------- */

  let rows = analysis.neighbors;
  const initialCount = rows.length;

  const afterWindow = rows.filter((row) => withinWindow(row, windowMs));
  if (afterWindow.length !== rows.length) {
    reduction.push({
      rule: "time-window",
      removed: rows.length - afterWindow.length,
      detail: `Counterparties with no activity between ${window.start ?? "the start of the window"} and ${window.end ?? "now"}.`,
    });
  }
  rows = afterWindow;

  if (filters.minValueCoin > 0) {
    const kept = rows.filter((row) => row.link.value.coin >= filters.minValueCoin);
    if (kept.length !== rows.length) {
      reduction.push({
        rule: "min-value",
        removed: rows.length - kept.length,
        detail: `Counterparties below ${filters.minValueCoin} ${CHAINS[chain].ticker} of observed flow.`,
      });
    }
    rows = kept;
  }

  if (filters.direction !== "both") {
    const kept = rows.filter((row) => row.direction === filters.direction);
    if (kept.length !== rows.length) {
      reduction.push({
        rule: "direction",
        removed: rows.length - kept.length,
        detail: `Showing ${filters.direction === "in" ? "senders" : "receivers"} only.`,
      });
    }
    rows = kept;
  }

  // Noisy hubs are suppressed, not deleted: an exchange is a hub by construction
  // and will otherwise dominate every ego network it appears in. The highest
  // value ones stay so the exit points remain visible.
  if (filters.suppressServiceHubs) {
    const hubs = rows.filter(isServiceHub);
    if (hubs.length > 3) {
      const keep = new Set(
        [...hubs].sort((a, b) => b.link.value.coin - a.link.value.coin).slice(0, 3),
      );
      const kept = rows.filter((row) => !isServiceHub(row) || keep.has(row));
      reduction.push({
        rule: "service-hub-suppression",
        removed: rows.length - kept.length,
        detail:
          "Attributed services are hubs by construction. The three largest by value are kept; the rest are collapsed out of the view but remain in the metrics.",
      });
      rows = kept;
    }
  }

  const maxValueRaw = rows.reduce(
    (max, row) => (BigInt(row.link.value.raw) > max ? BigInt(row.link.value.raw) : max),
    0n,
  );
  const ranked = [...rows]
    .map((row) => ({ row, priority: priorityOf(row, maxValueRaw, now) }))
    .sort((a, b) =>
      b.priority === a.priority
        ? a.row.node.address.localeCompare(b.row.node.address)
        : b.priority - a.priority,
    );

  const ringOne = ranked.slice(0, filters.topK);
  if (ranked.length > ringOne.length) {
    reduction.push({
      rule: "top-k",
      removed: ranked.length - ringOne.length,
      detail: `Ring 1 limited to the ${filters.topK} highest-priority counterparties of ${ranked.length}.`,
    });
  }

  /* --- assemble ---------------------------------------------------------- */

  const centre: EgoNode = {
    id: centreId,
    chain,
    address: analysis.address.address,
    label: analysis.entity.label,
    ring: 0,
    ringIndex: 0,
    kind: "entity",
    riskScore: analysis.address.risk.score,
    riskLevel: analysis.address.risk.level as RiskLevel,
    tags: analysis.address.tags,
    priority: analysis.address.risk.score,
    isServiceHub: analysis.address.tags.some((tag) => SERVICE_CATEGORIES.has(tag.category)),
    txCount: analysis.address.txCount,
    value: analysis.address.balance,
    direction: "self",
    expandable: false,
  };

  const nodes: EgoNode[] = [centre];
  const edges: EgoEdge[] = [];
  const incomplete: { address: string; reason: string }[] = [];
  const returnPaths: { via: string; back: string }[] = [];

  // A counterparty that both sent and received is two aggregated rows but one
  // actor. Emitting it twice put duplicate ids in the graph and the table; the
  // node is merged here while both directed edges are kept, because which way
  // the value moved is the part an investigator cannot lose.
  const mergedRing = new Map<string, EgoNode>();
  ringOne.forEach(({ row, priority }) => {
    const existing = mergedRing.get(row.node.id);
    if (existing) {
      existing.direction = existing.direction === row.direction ? existing.direction : "both";
      existing.txCount += row.link.txCount;
      existing.value = makeValue(
        BigInt(existing.value.raw) + BigInt(row.link.value.raw),
        chain,
        analysis.priceUsd,
      );
      existing.priority = Math.max(existing.priority, priority);
      return;
    }
    mergedRing.set(row.node.id, toEgoNode(row, 1, priority, filters.hopDepth > 1));
  });

  [...mergedRing.values()]
    .sort((a, b) =>
      b.priority === a.priority ? a.address.localeCompare(b.address) : b.priority - a.priority,
    )
    .forEach((node, index) => {
      node.ringIndex = index;
      nodes.push(node);
    });

  ringOne.forEach(({ row }) => {
    edges.push({
      id: `${nodeId(chain, row.link.source)}->${nodeId(chain, row.link.target)}`,
      source: nodeId(chain, row.link.source),
      target: nodeId(chain, row.link.target),
      txCount: row.link.txCount,
      value: row.link.value,
      firstSeen: row.link.firstSeen,
      lastSeen: row.link.lastSeen,
      direction: row.direction,
      ring: 1,
    });
  });

  if (filters.hopDepth > 1) {
    const clusterMembers = new Set(
      analysis.entity.addresses.map((member) => nodeId(chain, member)),
    );
    const seen = new Set(nodes.map((node) => node.id));

    const uniqueRingOne = [...mergedRing.values()];
    const expandTargets = uniqueRingOne
      .filter((node) => !node.isServiceHub)
      .slice(0, HOP2_EXPANSION_CAP);

    if (uniqueRingOne.length > expandTargets.length) {
      reduction.push({
        rule: "hop-2-expansion-cap",
        removed: uniqueRingOne.length - expandTargets.length,
        detail: `Second hop expanded ${expandTargets.length} of ${uniqueRingOne.length} ring-1 nodes. Each expansion is one explorer request, and attributed services are not expanded because their neighbourhoods are unbounded.`,
      });
    }

    const expansions = await mapWithConcurrency(
      expandTargets,
      HOP2_CONCURRENCY,
      async (parent) => {
        try {
          const sub = await analyzeAddress(chain, parent.address, 25, options.copy);
          return { parent, sub, error: null as string | null };
        } catch (error) {
          return {
            parent,
            sub: null,
            error: error instanceof Error ? error.message : "expansion failed",
          };
        }
      },
    );

    let ringTwoIndex = 0;
    for (const { parent, sub, error } of expansions) {
      if (!sub) {
        incomplete.push({ address: parent.address, reason: error ?? "unavailable" });
        continue;
      }

      const inner = [...sub.neighbors]
        .sort((a, b) => b.link.value.coin - a.link.value.coin)
        .slice(0, Math.max(3, Math.floor(filters.topK / 3)));

      for (const child of inner) {
        const childId = child.node.id;

        // A second-hop node that lands back on the subject's own cluster is the
        // round-tripping signal; it is recorded rather than drawn as a new node.
        if (clusterMembers.has(childId)) {
          returnPaths.push({ via: parent.address, back: child.node.address });
          continue;
        }
        if (seen.has(childId)) continue;
        if (nodes.length >= filters.maxNodes || edges.length >= filters.maxEdges) break;

        seen.add(childId);
        const node = toEgoNode(child, 2, priorityOf(child, maxValueRaw, now), false);
        node.ringIndex = ringTwoIndex++;
        nodes.push(node);
        edges.push({
          id: `${nodeId(chain, child.link.source)}->${nodeId(chain, child.link.target)}`,
          source: nodeId(chain, child.link.source),
          target: nodeId(chain, child.link.target),
          txCount: child.link.txCount,
          value: child.link.value,
          firstSeen: child.link.firstSeen,
          lastSeen: child.link.lastSeen,
          direction: child.direction,
          ring: 2,
        });
      }
    }
  }

  const truncated = nodes.length >= filters.maxNodes || edges.length >= filters.maxEdges;
  if (truncated) {
    reduction.push({
      rule: "hard-cap",
      removed: 0,
      detail: `Extraction stopped at the ${filters.maxNodes}-node / ${filters.maxEdges}-edge ceiling.`,
    });
  }

  // Metrics are computed over the unreduced counterparty set: reduction shapes
  // what is drawn, and must not quietly change what is measured.
  const metrics = computeMetrics({
    chain,
    transactions: analysis.transactions,
    neighbors: analysis.neighbors,
    priceUsd: analysis.priceUsd,
    totalReceivedRaw: BigInt(analysis.address.totalReceived.raw),
    totalSentRaw: BigInt(analysis.address.totalSent.raw),
  });

  if (initialCount !== analysis.neighbors.length) {
    reduction.push({
      rule: "source-window",
      removed: 0,
      detail: "Counterparties derive from the explorer's transaction page, not full history.",
    });
  }

  return {
    network: {
      centre,
      nodes,
      edges,
      metrics,
      filters,
      window,
      reduction,
      truncated,
      incomplete,
    },
    analysis,
    returnPaths,
  };
}

export { makeValue };
