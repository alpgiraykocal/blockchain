import { cached } from "../cache";
import { fetchJson } from "../http";
import { makeValue } from "../format";
import type { ChainStats, TimePoint, Transaction, TxIO } from "../types";
import {
  UnionFind,
  type AddressBundle,
  type ChainAdapter,
  type ClusterInfo,
  type NeighborAgg,
  type PriceInfo,
} from "./adapter";

const API = "https://mempool.space/api";

interface EsploraStats {
  funded_txo_count: number;
  funded_txo_sum: number;
  spent_txo_count: number;
  spent_txo_sum: number;
  tx_count: number;
}

interface EsploraAddress {
  address: string;
  chain_stats: EsploraStats;
  mempool_stats: EsploraStats;
}

interface EsploraVin {
  txid: string;
  is_coinbase: boolean;
  prevout: { scriptpubkey_address?: string; value: number } | null;
}

interface EsploraVout {
  scriptpubkey_address?: string;
  value: number;
}

interface EsploraTx {
  txid: string;
  fee: number;
  vin: EsploraVin[];
  vout: EsploraVout[];
  status: { confirmed: boolean; block_height?: number; block_time?: number };
}

function isoFromUnix(seconds?: number): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function inputAddresses(tx: EsploraTx): string[] {
  return tx.vin
    .filter((vin) => !vin.is_coinbase && vin.prevout?.scriptpubkey_address)
    .map((vin) => vin.prevout!.scriptpubkey_address as string);
}

function outputAddresses(tx: EsploraTx): string[] {
  return tx.vout
    .filter((vout) => vout.scriptpubkey_address)
    .map((vout) => vout.scriptpubkey_address as string);
}

/** Multi-input (co-spend) heuristic: addresses signing inputs of the same
 *  transaction are assumed to be controlled by one actor. This is GraphSense's
 *  primary UTXO clustering rule. Coinbase inputs are skipped — they have no signer. */
function clusterFromTxs(address: string, txs: EsploraTx[]): ClusterInfo {
  const uf = new UnionFind();
  uf.find(address);

  for (const tx of txs) {
    const inputs = inputAddresses(tx);
    if (inputs.length < 2) continue;
    // Only merge sets that actually touch the address under analysis, so an
    // unrelated co-spend in the same page cannot pull in a foreign cluster.
    if (!inputs.includes(address)) continue;
    for (let i = 1; i < inputs.length; i++) uf.union(inputs[0], inputs[i]);
  }

  const members = uf.membersOf(address);
  return {
    id: `btc:${members[0] ?? address}`,
    method: members.length > 1 ? "multi-input" : "none",
    addresses: members,
    partial: true,
  };
}

function toTransaction(
  tx: EsploraTx,
  address: string,
  clusterMembers: Set<string>,
  price: number | null,
): Transaction {
  const inputs: TxIO[] = tx.vin
    .filter((vin) => !vin.is_coinbase)
    .map((vin) => ({
      address: vin.prevout?.scriptpubkey_address ?? null,
      value: makeValue(BigInt(vin.prevout?.value ?? 0), "btc", price),
    }));

  const outputs: TxIO[] = tx.vout.map((vout) => ({
    address: vout.scriptpubkey_address ?? null,
    value: makeValue(BigInt(vout.value), "btc", price),
  }));

  let spent = 0n;
  for (const vin of tx.vin) {
    const owner = vin.prevout?.scriptpubkey_address;
    if (owner && clusterMembers.has(owner)) spent += BigInt(vin.prevout!.value);
  }
  let received = 0n;
  for (const vout of tx.vout) {
    if (vout.scriptpubkey_address && clusterMembers.has(vout.scriptpubkey_address)) {
      received += BigInt(vout.value);
    }
  }

  const net = received - spent;
  const totalOut = tx.vout.reduce((sum, vout) => sum + BigInt(vout.value), 0n);

  return {
    chain: "btc",
    hash: tx.txid,
    height: tx.status.block_height ?? null,
    timestamp: isoFromUnix(tx.status.block_time),
    confirmed: tx.status.confirmed,
    fee: makeValue(BigInt(tx.fee ?? 0), "btc", price),
    totalValue: makeValue(totalOut, "btc", price),
    inputs,
    outputs,
    netForAddress: makeValue(net, "btc", price),
    direction: net > 0n ? "in" : net < 0n ? "out" : "self",
  };
}

/** Aggregate counterparties into directed links, the way GraphSense stores
 *  address relations: one edge per (neighbor, direction) with summed value. */
function aggregateNeighbors(
  txs: EsploraTx[],
  clusterMembers: Set<string>,
): NeighborAgg[] {
  const byKey = new Map<string, NeighborAgg>();

  const bump = (
    address: string,
    direction: "in" | "out",
    valueRaw: bigint,
    timestamp: string | null,
  ) => {
    if (clusterMembers.has(address)) return;
    const key = `${direction}:${address}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.txCount += 1;
      existing.valueRaw += valueRaw;
      if (timestamp) {
        if (!existing.firstSeen || timestamp < existing.firstSeen) existing.firstSeen = timestamp;
        if (!existing.lastSeen || timestamp > existing.lastSeen) existing.lastSeen = timestamp;
      }
      return;
    }
    byKey.set(key, {
      address,
      direction,
      txCount: 1,
      valueRaw,
      firstSeen: timestamp,
      lastSeen: timestamp,
      label: null,
      isContract: false,
    });
  };

  for (const tx of txs) {
    const timestamp = isoFromUnix(tx.status.block_time);
    const inputs = inputAddresses(tx);
    const spentByUs = inputs.some((address) => clusterMembers.has(address));

    if (spentByUs) {
      // We funded this tx — every foreign output is a receiver.
      for (const vout of tx.vout) {
        const target = vout.scriptpubkey_address;
        if (!target) continue;
        bump(target, "out", BigInt(vout.value), timestamp);
      }
    } else {
      // We only received — every input address is a sender.
      const receivedByUs = outputAddresses(tx).some((address) => clusterMembers.has(address));
      if (!receivedByUs) continue;
      for (const vin of tx.vin) {
        const source = vin.prevout?.scriptpubkey_address;
        if (!source) continue;
        bump(source, "in", BigInt(vin.prevout!.value), timestamp);
      }
    }
  }

  // Ties must compare equal. Returning -1 for them made this an inconsistent
  // comparator, which leaves the order of equal-value counterparties up to the
  // sort's internals rather than stable between two identical requests.
  return [...byKey.values()].sort((a, b) =>
    b.valueRaw > a.valueRaw ? 1 : b.valueRaw < a.valueRaw ? -1 : 0,
  );
}

export const btcAdapter: ChainAdapter = {
  chain: "btc",

  async getPrice(): Promise<PriceInfo> {
    return cached("btc:price", 60_000, async () => {
      const data = await fetchJson<{ USD?: number }>(`${API}/v1/prices`);
      return { usd: data?.USD ?? null, change24h: null };
    });
  },

  async resolve(query: string) {
    return query.trim();
  },

  async getAddressBundle(address: string, limit: number): Promise<AddressBundle> {
    return cached(`btc:bundle:${address}:${limit}`, 45_000, async () => {
      // The summary endpoint answers in well under a second; the tx list can take
      // half a minute on a heavy address, and regularly times out entirely. Let
      // them fail independently rather than losing the whole report to the slow one.
      const [{ usd: price }, stats, txResult] = await Promise.all([
        btcAdapter.getPrice(),
        fetchJson<EsploraAddress>(`${API}/address/${encodeURIComponent(address)}`),
        fetchJson<EsploraTx[]>(`${API}/address/${encodeURIComponent(address)}/txs`, {
          timeoutMs: 25_000,
          retries: 0,
        })
          .then((value) => ({ txs: value, error: null as string | null }))
          .catch((error: unknown) => ({
            txs: [] as EsploraTx[],
            error: error instanceof Error ? error.message : "transaction list unavailable",
          })),
      ]);

      const txs = txResult.txs.slice(0, limit);
      const cluster = clusterFromTxs(address, txs);
      const members = new Set(cluster.addresses);

      const confirmed = stats.chain_stats;
      const mempool = stats.mempool_stats;
      const receivedRaw = BigInt(confirmed.funded_txo_sum) + BigInt(mempool.funded_txo_sum);
      const sentRaw = BigInt(confirmed.spent_txo_sum) + BigInt(mempool.spent_txo_sum);

      const timestamps = txs
        .map((tx) => isoFromUnix(tx.status.block_time))
        .filter((value): value is string => Boolean(value))
        .sort();

      return {
        chain: "btc",
        address,
        balanceRaw: receivedRaw - sentRaw,
        receivedRaw,
        sentRaw,
        txCount: confirmed.tx_count + mempool.tx_count,
        isContract: false,
        label: null,
        publicTags: [],
        firstSeen: timestamps[0] ?? null,
        lastSeen: timestamps[timestamps.length - 1] ?? null,
        txs: txs.map((tx) => toTransaction(tx, address, members, price)),
        neighbors: aggregateNeighbors(txs, members),
        cluster,
        totalsWindowed: false,
        windowSize: txs.length,
        txsUnavailable: txResult.error,
      } satisfies AddressBundle;
    });
  },

  async getStats(): Promise<ChainStats> {
    return cached("btc:stats", 60_000, async () => {
      const [{ usd }, height, mempool, feeHistory] = await Promise.all([
        btcAdapter.getPrice(),
        fetchJson<string>(`${API}/blocks/tip/height`, { accept: "text" }),
        fetchJson<{ count: number; vsize: number; total_fee: number }>(`${API}/mempool`),
        fetchJson<{ avgFee_50?: number; timestamp?: number }[]>(
          `${API}/v1/mining/blocks/fee-rates/1w`,
        ).catch(() => [] as { avgFee_50?: number; timestamp?: number }[]),
      ]);

      const series: TimePoint[] = feeHistory
        .filter((point) => point.timestamp && point.avgFee_50 != null)
        .slice(-60)
        .map((point) => ({
          t: new Date(point.timestamp! * 1000).toISOString(),
          v: point.avgFee_50!,
        }));

      return {
        chain: "btc",
        blockHeight: Number(height) || 0,
        priceUsd: usd,
        priceChange24h: null,
        txCount24h: null,
        avgFee:
          mempool && mempool.count > 0
            ? makeValue(BigInt(Math.round(mempool.total_fee / mempool.count)), "btc", usd)
            : null,
        mempoolSize: mempool?.count ?? null,
        series,
        seriesLabel: "Median fee rate (1w)",
        seriesUnit: "sat/vB",
      } satisfies ChainStats;
    });
  },
};
