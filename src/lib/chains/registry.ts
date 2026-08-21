import type { ChainId, ChainMeta } from "../types";

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
};

export const CHAIN_IDS = Object.keys(CHAINS) as ChainId[];

export function isChainId(value: string): value is ChainId {
  return value in CHAINS;
}

const BTC_BECH32 = /^(bc1)[0-9ac-hj-np-z]{11,71}$/i;
const BTC_BASE58 = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const ETH_HEX = /^0x[0-9a-fA-F]{40}$/;
const ETH_ENS = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i;

export function detectChain(query: string): ChainId | null {
  const value = query.trim();
  if (ETH_HEX.test(value) || ETH_ENS.test(value)) return "eth";
  if (BTC_BECH32.test(value) || BTC_BASE58.test(value)) return "btc";
  return null;
}

export function isValidAddress(chain: ChainId, address: string): boolean {
  const value = address.trim();
  if (chain === "eth") return ETH_HEX.test(value) || ETH_ENS.test(value);
  return BTC_BECH32.test(value) || BTC_BASE58.test(value);
}
