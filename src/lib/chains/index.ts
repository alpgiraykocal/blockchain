import type { ChainId } from "../types";
import type { ChainAdapter } from "./adapter";
import { btcAdapter } from "./btc";
import { ethAdapter } from "./eth";

const ADAPTERS: Record<ChainId, ChainAdapter> = {
  btc: btcAdapter,
  eth: ethAdapter,
};

export function getAdapter(chain: ChainId): ChainAdapter {
  return ADAPTERS[chain];
}

export * from "./adapter";
export * from "./registry";
