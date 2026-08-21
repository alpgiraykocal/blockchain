/** Domain model. Mirrors the GraphSense concepts: address, entity (cluster), tag, link. */

export type ChainId = "btc" | "eth";

export type ChainModel = "utxo" | "account";

export interface ChainMeta {
  id: ChainId;
  name: string;
  ticker: string;
  model: ChainModel;
  decimals: number;
  explorerName: string;
  explorerTxUrl: (hash: string) => string;
  explorerAddressUrl: (address: string) => string;
}

/** A value expressed in the chain's base unit (satoshi / wei) plus a fiat estimate. */
export interface Value {
  /** Base units as a decimal string — BigInt-safe across the wire. */
  raw: string;
  /** Human-readable coin amount. */
  coin: number;
  /** USD estimate at the current spot rate, null when no rate is available. */
  usd: number | null;
}

export interface AddressSummary {
  chain: ChainId;
  address: string;
  /** Entity (cluster) the address belongs to, when clustering resolved one. */
  entityId: string | null;
  balance: Value;
  totalReceived: Value;
  totalSent: Value;
  txCount: number;
  inDegree: number;
  outDegree: number;
  firstSeen: string | null;
  lastSeen: string | null;
  isContract: boolean;
  tags: Tag[];
  risk: RiskAssessment;
}

export interface EntitySummary {
  chain: ChainId;
  entityId: string;
  /** Best-known label for the cluster, derived from its highest-confidence tag. */
  label: string | null;
  addressCount: number;
  addresses: string[];
  balance: Value;
  totalReceived: Value;
  totalSent: Value;
  tags: Tag[];
  risk: RiskAssessment;
  /** How the cluster was derived, so an analyst can judge its reliability. */
  method: ClusteringMethod;
}

export type ClusteringMethod =
  | "multi-input"
  | "account-identity"
  | "manual"
  | "none";

export interface TxIO {
  address: string | null;
  value: Value;
}

export interface Transaction {
  chain: ChainId;
  hash: string;
  height: number | null;
  timestamp: string | null;
  confirmed: boolean;
  fee: Value;
  totalValue: Value;
  inputs: TxIO[];
  outputs: TxIO[];
  /** Signed net effect on the address the tx was fetched for. */
  netForAddress?: Value;
  direction?: "in" | "out" | "self";
}

/** A directed aggregate edge between two nodes — GraphSense calls these "links". */
export interface Link {
  source: string;
  target: string;
  txCount: number;
  value: Value;
  firstSeen: string | null;
  lastSeen: string | null;
}

export type NodeKind =
  | "address"
  | "entity"
  | "exchange"
  | "mixer"
  | "service"
  | "unknown";

export interface GraphNode {
  id: string;
  chain: ChainId;
  kind: NodeKind;
  address: string;
  label: string | null;
  balance: Value;
  txCount: number;
  riskScore: number;
  tags: Tag[];
  /** Set when the node was produced by expanding another node. */
  expandedFrom?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  value: Value;
  txCount: number;
  direction: "in" | "out";
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/* ---------------------------------------------------------------- tags */

export type TagSource = "tagpack" | "sanctions" | "user";

export type AbuseType =
  | "sanctions"
  | "ransomware"
  | "scam"
  | "darknet-market"
  | "mixer"
  | "theft"
  | "terrorism-financing"
  | "none";

export type ActorCategory =
  | "exchange"
  | "mining-pool"
  | "gambling"
  | "mixer"
  | "defi"
  | "bridge"
  | "merchant"
  | "wallet-service"
  | "individual"
  | "unknown";

export interface Tag {
  id: string;
  chain: ChainId;
  /** Address or entity id the tag is attached to. */
  subject: string;
  label: string;
  category: ActorCategory;
  abuse: AbuseType;
  /** 0..1 — how much the tag can be trusted. */
  confidence: number;
  source: TagSource;
  /** TagPack the tag came from, for provenance. */
  pack: string;
  createdAt: string;
  notes?: string;
}

export interface TagPack {
  id: string;
  title: string;
  creator: string;
  description: string;
  lastmod: string;
  tags: Tag[];
}

/* ---------------------------------------------------------------- risk */

export type RiskLevel = "clear" | "low" | "medium" | "high" | "severe";

export interface RiskSignal {
  code: string;
  label: string;
  weight: number;
  detail: string;
}

export interface RiskAssessment {
  /** 0..100 */
  score: number;
  level: RiskLevel;
  signals: RiskSignal[];
  /** Direct + indirect exposure hops considered when scoring. */
  hops: number;
}

/* ---------------------------------------------------------------- stats */

export interface ChainStats {
  chain: ChainId;
  blockHeight: number;
  priceUsd: number | null;
  priceChange24h: number | null;
  txCount24h: number | null;
  avgFee: Value | null;
  mempoolSize: number | null;
  /** Fee or gas history for the trend chart. */
  series: TimePoint[];
  seriesLabel: string;
  seriesUnit: string;
}

export interface TimePoint {
  t: string;
  v: number;
}

export interface ApiError {
  error: string;
  detail?: string;
}
