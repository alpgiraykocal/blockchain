import type { AssetId, AssetMeta, ChainId, ChainMeta } from "../types";

export const CHAINS: Record<ChainId, ChainMeta> = {
  btc: {
    id: "btc",
    name: "Bitcoin",
    ticker: "BTC",
    model: "utxo",
    decimals: 8,
    explorerName: "mempool.space",
    explorerTxUrl: (hash) => `https://mempool.space/tx/${hash}`,
    explorerAddressUrl: (address) => `https://mempool.space/address/${address}`,
  },
  eth: {
    id: "eth",
    name: "Ethereum",
    ticker: "ETH",
    model: "account",
    decimals: 18,
    explorerName: "Blockscout",
    explorerTxUrl: (hash) => `https://eth.blockscout.com/tx/${hash}`,
    explorerAddressUrl: (address) => `https://eth.blockscout.com/address/${address}`,
  },
  tron: {
    id: "tron",
    name: "TRON",
    ticker: "TRX",
    model: "account",
    decimals: 6,
    explorerName: "TronGrid",
    explorerTxUrl: (hash) => `https://tronscan.org/#/transaction/${hash}`,
    explorerAddressUrl: (address) => `https://tronscan.org/#/address/${address}`,
  },
};

export const CHAIN_IDS = Object.keys(CHAINS) as ChainId[];

export function isChainId(value: string): value is ChainId {
  return value in CHAINS;
}

const BTC_BECH32 = /^(bc1)[0-9ac-hj-np-z]{11,71}$/i;
const BTC_BASE58 = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const ETH_HEX = /^0x[0-9a-fA-F]{40}$/;
/** Base58Check, always 34 characters, always leading `T` on mainnet. The
 *  alphabet excludes 0, O, I and l, which is what keeps it distinguishable
 *  from a Bitcoin base58 address of similar length. */
const TRON_BASE58 = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const ETH_ENS = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i;

export function detectChain(query: string): ChainId | null {
  const value = query.trim();
  if (ETH_HEX.test(value) || ETH_ENS.test(value)) return "eth";
  // Tron before Bitcoin: a `T`-leading base58 string is unambiguous, while the
  // Bitcoin pattern is anchored to 1 or 3 and cannot claim it either way.
  if (TRON_BASE58.test(value)) return "tron";
  if (BTC_BECH32.test(value) || BTC_BASE58.test(value)) return "btc";
  return null;
}

export function isValidAddress(chain: ChainId, address: string): boolean {
  const value = address.trim();
  if (chain === "eth") return ETH_HEX.test(value) || ETH_ENS.test(value);
  if (chain === "tron") return TRON_BASE58.test(value);
  return BTC_BECH32.test(value) || BTC_BASE58.test(value);
}

/**
 * Assets an analysis can be run over.
 *
 * `AssetId` is deliberately a superset of `ChainId`: a chain's native asset is
 * keyed by the chain's own id, so anything that already passes a chain where an
 * asset is wanted keeps working and keeps meaning the same thing. Only the
 * tokens need new ids.
 *
 * A token is identified by its contract address and never by its symbol. On a
 * single page of Tether's own transfers there were four separate contracts
 * calling themselves USDT through Unicode lookalikes - Cyrillic Ѕ and Т, an
 * accented Ú, a dotted Ḍ. Matching on the symbol would merge those scams into
 * the real balance.
 */
export const ASSETS: Record<AssetId, AssetMeta> = {
  btc: { id: "btc", chain: "btc", symbol: "BTC", name: "Bitcoin", decimals: 8, kind: "native" },
  eth: { id: "eth", chain: "eth", symbol: "ETH", name: "Ether", decimals: 18, kind: "native" },
  "usdt-eth": {
    id: "usdt-eth",
    chain: "eth",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    kind: "erc20",
    contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  },
  tron: { id: "tron", chain: "tron", symbol: "TRX", name: "Tronix", decimals: 6, kind: "native" },
  "usdt-tron": {
    id: "usdt-tron",
    chain: "tron",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    kind: "trc20",
    contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  },
};

export const ASSET_IDS = Object.keys(ASSETS) as AssetId[];

export function isAssetId(value: string): value is AssetId {
  return value in ASSETS;
}

/** Assets that can be analysed on a chain, native first. */
export function assetsFor(chain: ChainId): AssetMeta[] {
  return ASSET_IDS.map((id) => ASSETS[id])
    .filter((asset) => asset.chain === chain)
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "native" ? -1 : 1));
}

/** The native asset of a chain — the default subject of any analysis. */
export function nativeAsset(chain: ChainId): AssetId {
  return chain;
}
