/**
 * Open-source actor attribution feeds.
 *
 * Every source here must be redistributable: the generated snapshot is committed
 * to this repo and shipped with the app. A feed whose licence is unstated is not
 * a feed we may republish, however useful it looks — those are listed as
 * `licence: "unspecified"` and stay out of the default bundle.
 */

export type SourceId =
  | "graphsense-tagpacks"
  | "mempool-mining-pools"
  | "ethereum-lists-contracts";

export interface SourceDefinition {
  id: SourceId;
  title: string;
  homepage: string;
  /** SPDX identifier, or "unspecified" when the project publishes no licence. */
  licence: string;
  attribution: string;
  /** Sources without a clear licence require --allow-unlicensed to be included. */
  redistributable: boolean;
  note?: string;
}

export const SOURCES: Record<SourceId, SourceDefinition> = {
  "graphsense-tagpacks": {
    id: "graphsense-tagpacks",
    title: "GraphSense public TagPacks",
    homepage: "https://github.com/graphsense/graphsense-tagpacks",
    licence: "MIT",
    attribution: "© Iknaio Cryptoasset Analytics GmbH and contributors, MIT licence",
    redistributable: true,
  },
  "mempool-mining-pools": {
    id: "mempool-mining-pools",
    title: "mempool.space mining pool registry",
    homepage: "https://github.com/mempool/mining-pools",
    licence: "MIT",
    attribution: "© btc.com and mempool.space contributors, MIT licence",
    redistributable: true,
  },
  "ethereum-lists-contracts": {
    id: "ethereum-lists-contracts",
    title: "ethereum-lists contract registry",
    homepage: "https://github.com/ethereum-lists/contracts",
    licence: "unspecified",
    attribution: "ethereum-lists contributors — no licence published",
    redistributable: false,
    note:
      "Roughly 200k contract-to-project labels, but the repository ships no LICENSE file and the README states none, so redistribution rights are not granted. Enable with --allow-unlicensed only if you have cleared this yourself.",
  },
};

/** GraphSense taxonomy → the actor categories ChainLens renders. */
export const CATEGORY_MAP: Record<string, string> = {
  exchange: "exchange",
  decentralized_exchange: "defi",
  miner: "mining-pool",
  mining_pool: "mining-pool",
  wallet_service: "wallet-service",
  hosted_wallet: "wallet-service",
  custodial_wallet: "wallet-service",
  gambling: "gambling",
  faucet: "merchant",
  merchant_service: "merchant",
  shop: "merchant",
  payment_processor: "merchant",
  atm: "merchant",
  bridge: "bridge",
  mixing_service: "mixer",
  coinjoin: "mixer",
  defi: "defi",
  defi_dex: "defi",
  defi_lending: "defi",
  defi_yield: "defi",
  defi_bridge: "bridge",
  defi_derivatives: "defi",
  defi_staking: "defi",
  defi_cdp: "defi",
  defi_services: "defi",
  defi_liquid_staking: "defi",
  defi_farm: "defi",
  defi_algo_stables: "defi",
  defi_insurance: "defi",
  defi_launchpad: "defi",
  defi_nft: "defi",
  defi_options: "defi",
  defi_payments: "defi",
  defi_privacy: "defi",
  defi_prediction_market: "defi",
  defi_reserve_currency: "defi",
  defi_synthetics: "defi",
  defi_yield_aggregator: "defi",
  defi_derivative: "defi",
  mining_service: "mining-pool",
  index: "defi",
  collectible: "defi",
  market: "merchant",
  marketplace: "merchant",
  perpetuals: "defi",
  cold_wallet: "wallet-service",
  // Deliberately non-specific: these say an actor exists, not what it does, and
  // must never outrank a real category on the same actor.
  organization: "unknown",
  other: "unknown",
  service: "unknown",
  hosting: "unknown",
  vpn: "unknown",
  dark_web: "unknown",
};

/** Categories that carry no behavioural meaning. When an actor lists several,
 *  a specific one always wins - otherwise "organization", which is the single
 *  most common value in the actor pack, would flatten every exchange and DeFi
 *  protocol into "unknown". */
export const VAGUE_CATEGORIES = new Set(["unknown"]);

export function pickCategory(values: string[]): string {
  const mapped = values.map((value) => CATEGORY_MAP[value]).filter(Boolean);
  return mapped.find((value) => !VAGUE_CATEGORIES.has(value)) ?? mapped[0] ?? "unknown";
}

/** GraphSense confidence levels → a 0..1 weight. Anything unmapped falls back to
 *  a deliberately unflattering default so an unknown level cannot inflate a tag. */
export const CONFIDENCE_MAP: Record<string, number> = {
  ownership: 0.98,
  authority_data: 0.95,
  trusted_data_provider: 0.9,
  service_data: 0.85,
  manual: 0.8,
  forensic: 0.7,
  web_crawl: 0.55,
  heuristic: 0.5,
  proprietary_data: 0.75,
  default: 0.5,
};

export const DEFAULT_CONFIDENCE = 0.5;
