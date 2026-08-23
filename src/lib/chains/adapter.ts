import type { Impersonation } from "./homoglyph";
import type {
  AssetId,
  ChainId,
  ChainStats,
  ClusteringMethod,
  Transaction,
} from "../types";

export interface NeighborAgg {
  address: string;
  direction: "in" | "out";
  txCount: number;
  valueRaw: bigint;
  firstSeen: string | null;
  lastSeen: string | null;
  label: string | null;
  isContract: boolean;
}

export interface ClusterInfo {
  id: string;
  method: ClusteringMethod;
  addresses: string[];
  /** True when the cluster was derived from a bounded tx window rather than the full chain. */
  partial: boolean;
}

export interface AddressBundle {
  chain: ChainId;
  /** Which asset the figures below are denominated in. */
  asset: AssetId;
  address: string;
  balanceRaw: bigint;
  receivedRaw: bigint;
  sentRaw: bigint;
  txCount: number;
  isContract: boolean;
  label: string | null;
  publicTags: string[];
  firstSeen: string | null;
  lastSeen: string | null;
  txs: Transaction[];
  neighbors: NeighborAgg[];
  cluster: ClusterInfo;
  /** received/sent totals cover only the fetched window, not the whole history. */
  totalsWindowed: boolean;
  windowSize: number;
  /** Tokens seen moving to or from this address whose symbol imitates a known
   *  asset from a contract that is not it. Empty where the chain has no tokens. */
  tokenImpersonators: Impersonation[];
  /** Set when the transaction list could not be fetched. The summary figures are
   *  still valid; counterparties, clustering and degrees are not available. */
  txsUnavailable: string | null;
}

export interface PriceInfo {
  usd: number | null;
  change24h: number | null;
}

export interface ChainAdapter {
  chain: ChainId;
  /** Price of an asset on this chain; the native coin when none is named. */
  getPrice(asset?: AssetId): Promise<PriceInfo>;
  /** Resolves ENS-style names to a canonical address; identity for plain addresses. */
  resolve(query: string): Promise<string | null>;
  /** Analyses one asset. Omitting it analyses the chain's native coin, which is
   *  what every caller wanted before tokens existed here. */
  getAddressBundle(address: string, limit: number, asset?: AssetId): Promise<AddressBundle>;
  getStats(): Promise<ChainStats>;
}

/** Union-find over address sets — the substrate of the multi-input clustering heuristic. */
export class UnionFind {
  private parent = new Map<string, string>();

  find(item: string): string {
    const seen = this.parent.get(item);
    if (seen === undefined) {
      this.parent.set(item, item);
      return item;
    }
    if (seen === item) return item;
    const root = this.find(seen);
    this.parent.set(item, root);
    return root;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;
    // Keep the lexicographically smallest address as the canonical cluster root
    // so cluster ids stay stable between runs.
    if (rootA < rootB) this.parent.set(rootB, rootA);
    else this.parent.set(rootA, rootB);
  }

  membersOf(item: string): string[] {
    const root = this.find(item);
    const members: string[] = [];
    for (const key of this.parent.keys()) {
      if (this.find(key) === root) members.push(key);
    }
    return members.sort();
  }
}
