import { getAdapter } from "./chains";
import type { NeighborAgg } from "./chains/adapter";
import type { Impersonation } from "./chains/homoglyph";
import { makeValue } from "./format";
import type { AmlCopy } from "./aml/copy";
import { en } from "./i18n/dictionaries/en";

import { assessRisk, nodeKindFor } from "./risk";
import { builtinTagsFor } from "./tags";
import type {
  AddressSummary,
  AssetId,
  ChainId,
  EntitySummary,
  GraphEdge,
  GraphNode,
  Link,
  Tag,
  Transaction,
} from "./types";

/** Callers that have no locale in hand - background jobs and internal expansion
 *  - fall back to English rather than being forced to invent one. */
const defaultCopy: AmlCopy = en.aml;

export interface NeighborRow {
  node: GraphNode;
  link: Link;
  direction: "in" | "out";
}

export interface AddressAnalysis {
  /** The asset every figure below is denominated in. */
  asset: AssetId;
  /** Tokens imitating a known asset's symbol from another contract. */
  impersonators: Impersonation[];
  address: AddressSummary;
  entity: EntitySummary;
  transactions: Transaction[];
  neighbors: NeighborRow[];
  priceUsd: number | null;
  /** Analysis window metadata so the UI never presents partial data as complete. */
  window: {
    txsAnalysed: number;
    txsTotal: number;
    totalsWindowed: boolean;
    clusterPartial: boolean;
    /** Non-null when the explorer could not serve the transaction list. */
    txsUnavailable: string | null;
  };
}

/** Attribution attached to an explorer-supplied public label, so Blockscout's own
 *  metadata (e.g. "Binance 14") shows up next to TagPack entries. */
function explorerTag(chain: ChainId, subject: string, label: string, copy: AmlCopy): Tag {
  return {
    id: `explorer:${chain}:${subject.toLowerCase()}`,
    chain,
    subject,
    label,
    category: "unknown",
    abuse: "none",
    confidence: 0.6,
    source: "tagpack",
    pack: "explorer-metadata",
    createdAt: new Date().toISOString(),
    notes: copy.explorerLabelNote,
  };
}

function tagsFor(
  chain: ChainId,
  address: string,
  explorerLabel: string | null,
  copy: AmlCopy,
): Tag[] {
  const tags = [...builtinTagsFor(chain, address)];
  if (explorerLabel && !tags.some((tag) => tag.label === explorerLabel)) {
    tags.push(explorerTag(chain, address, explorerLabel, copy));
  }
  return tags;
}

/** A cluster of 40 co-spending addresses that all carry the same exchange label
 *  produced 40 identical chips in the header. Collapse by what a reader can
 *  actually distinguish - the label, its category and where it came from -
 *  keeping the highest-confidence copy of each. */
function dedupeTags(tags: Tag[]): void {
  const best = new Map<string, Tag>();
  for (const tag of tags) {
    const key = `${tag.label}|${tag.category}|${tag.abuse}|${tag.pack}`;
    const existing = best.get(key);
    if (!existing || tag.confidence > existing.confidence) best.set(key, tag);
  }
  const kept = [...best.values()];
  tags.length = 0;
  tags.push(...kept);
}

function bestLabel(tags: Tag[]): string | null {
  if (!tags.length) return null;
  return [...tags].sort((a, b) => b.confidence - a.confidence)[0].label;
}

export async function analyzeAddress(
  chain: ChainId,
  address: string,
  limit = 50,
  /** Copy for the risk signals, which are prose an analyst reads. */
  copy: AmlCopy = defaultCopy,
  /** Which asset to denominate the analysis in. Defaults to the chain's native
   *  coin, which is what every caller meant before tokens existed here. */
  asset: AssetId = chain,
): Promise<AddressAnalysis> {
  const adapter = getAdapter(chain);
  const [{ usd: priceUsd }, bundle] = await Promise.all([
    adapter.getPrice(asset),
    adapter.getAddressBundle(address, limit, asset),
  ]);

  const ownTags = tagsFor(chain, bundle.address, bundle.label, copy);
  for (const member of bundle.cluster.addresses) {
    if (member === bundle.address) continue;
    for (const tag of builtinTagsFor(chain, member)) ownTags.push(tag);
  }
  dedupeTags(ownTags);

  const totalNeighborValue = bundle.neighbors.reduce(
    (sum, neighbor) => sum + neighbor.valueRaw,
    0n,
  );

  const neighbors: NeighborRow[] = bundle.neighbors.map((neighbor) =>
    toNeighborRow(chain, bundle.address, neighbor, totalNeighborValue, priceUsd, copy, asset),
  );

  const inDegree = neighbors.filter((row) => row.direction === "in").length;
  const outDegree = neighbors.filter((row) => row.direction === "out").length;
  const oneShot = neighbors.filter((row) => row.link.txCount === 1).length;

  const risk = assessRisk({
    copy,
    ownTags,
    neighborTags: neighbors
      .filter((row) => row.node.tags.length > 0)
      .map((row) => ({
        tags: row.node.tags,
        hops: 1,
        shareOfValue:
          totalNeighborValue === 0n
            ? 0
            : Number((BigInt(row.link.value.raw) * 10_000n) / totalNeighborValue) / 10_000,
      })),
    txCount: bundle.txCount,
    inDegree,
    outDegree,
    oneShotRatio: neighbors.length ? oneShot / neighbors.length : undefined,
  });

  const addressSummary: AddressSummary = {
    chain,
    address: bundle.address,
    entityId: bundle.cluster.id,
    balance: makeValue(bundle.balanceRaw, asset, priceUsd),
    totalReceived: makeValue(bundle.receivedRaw, asset, priceUsd),
    totalSent: makeValue(bundle.sentRaw, asset, priceUsd),
    txCount: bundle.txCount,
    inDegree,
    outDegree,
    firstSeen: bundle.firstSeen,
    lastSeen: bundle.lastSeen,
    isContract: bundle.isContract,
    tags: ownTags,
    risk,
  };

  const entity: EntitySummary = {
    chain,
    entityId: bundle.cluster.id,
    label: bestLabel(ownTags),
    addressCount: bundle.cluster.addresses.length,
    addresses: bundle.cluster.addresses,
    balance: addressSummary.balance,
    totalReceived: addressSummary.totalReceived,
    totalSent: addressSummary.totalSent,
    tags: ownTags,
    risk,
    method: bundle.cluster.method,
  };

  return {
    asset,
    impersonators: bundle.tokenImpersonators,
    address: addressSummary,
    entity,
    transactions: bundle.txs,
    neighbors,
    priceUsd,
    window: {
      txsAnalysed: bundle.windowSize,
      txsTotal: bundle.txCount,
      totalsWindowed: bundle.totalsWindowed,
      clusterPartial: bundle.cluster.partial,
      txsUnavailable: bundle.txsUnavailable,
    },
  };
}

function toNeighborRow(
  chain: ChainId,
  origin: string,
  neighbor: NeighborAgg,
  totalValue: bigint,
  priceUsd: number | null,
  copy: AmlCopy,
  asset: AssetId,
): NeighborRow {
  const tags = tagsFor(chain, neighbor.address, neighbor.label, copy);
  const value = makeValue(neighbor.valueRaw, asset, priceUsd);

  const risk = assessRisk({
    copy,
    ownTags: tags,
    neighborTags: [],
    txCount: neighbor.txCount,
    inDegree: neighbor.direction === "in" ? 1 : 0,
    outDegree: neighbor.direction === "out" ? 1 : 0,
  });

  const node: GraphNode = {
    id: nodeId(chain, neighbor.address),
    chain,
    kind: nodeKindFor(tags, false),
    address: neighbor.address,
    label: bestLabel(tags),
    balance: makeValue(0n, asset, priceUsd),
    txCount: neighbor.txCount,
    riskScore: risk.score,
    tags,
    expandedFrom: nodeId(chain, origin),
  };

  const link: Link = {
    source: neighbor.direction === "out" ? origin : neighbor.address,
    target: neighbor.direction === "out" ? neighbor.address : origin,
    txCount: neighbor.txCount,
    value,
    firstSeen: neighbor.firstSeen,
    lastSeen: neighbor.lastSeen,
  };

  void totalValue;
  return { node, link, direction: neighbor.direction };
}

export function nodeId(chain: ChainId, address: string): string {
  return `${chain}:${address.toLowerCase()}`;
}

/** Converts an analysis into the node/edge pair the graph canvas consumes. */
export function toGraphFragment(analysis: AddressAnalysis): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const root: GraphNode = {
    id: nodeId(analysis.address.chain, analysis.address.address),
    chain: analysis.address.chain,
    kind: nodeKindFor(analysis.address.tags, analysis.entity.addressCount > 1),
    address: analysis.address.address,
    label: analysis.entity.label,
    balance: analysis.address.balance,
    txCount: analysis.address.txCount,
    riskScore: analysis.address.risk.score,
    tags: analysis.address.tags,
  };

  const nodes: GraphNode[] = [root];
  const edges: GraphEdge[] = [];

  for (const row of analysis.neighbors) {
    nodes.push(row.node);
    const source = nodeId(row.node.chain, row.link.source);
    const target = nodeId(row.node.chain, row.link.target);
    edges.push({
      id: `${source}->${target}`,
      source,
      target,
      value: row.link.value,
      txCount: row.link.txCount,
      direction: row.direction,
    });
  }

  return { nodes, edges };
}
