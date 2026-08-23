import type { ChainId } from "../types";
import type { ChainAdapter } from "./adapter";
import { btcAdapter } from "./btc";
import { ethAdapter } from "./eth";
import { tronAdapter } from "./tron";

const ADAPTERS: Record<ChainId, ChainAdapter> = {
  btc: btcAdapter,
  eth: ethAdapter,
  tron: tronAdapter,
};

export function getAdapter(chain: ChainId): ChainAdapter {
  return ADAPTERS[chain];
}

export * from "./adapter";
export * from "./registry";
