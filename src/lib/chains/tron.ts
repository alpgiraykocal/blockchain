import { cached } from "../cache";
import { fetchJson } from "../http";
import { makeValue } from "../format";
import type { AssetId, ChainStats, Transaction } from "../types";
import { ASSETS } from "./registry";
import { fromHex } from "./tron-address";
import type {
  AddressBundle,
  ChainAdapter,
  NeighborAgg,
  PriceInfo,
} from "./adapter";

/**
 * TRON, through TronGrid.
 *
 * Keyless, like every other upstream here. The account and TRC-20 endpoints
 * answer without an API key at a rate this app's own limiter stays well inside.
 *
 * Two shapes of data come back and they do not match. TRC-20 transfers arrive
 * clean — Base58 counterparties, a value, a contract. Native TRX arrives as raw
 * contract objects of a dozen types, most of which are staking and resource
 * bookkeeping rather than payments, with every account in hex. Both are handled,
 * but only the transfers are simple.
 */

const API = "https://api.trongrid.io";
const TRONSCAN = "https://apilist.tronscanapi.com/api";
/** TronGrid has no price feed and TronScan's needs a key. */
const PRICE = "https://api.coingecko.com/api/v3/simple/price";

interface TrxAccount {
  address?: string;
  balance?: number;
  trc20?: Record<string, string>[];
}

interface Trc20Transfer {
  transaction_id: string;
  block_timestamp: number;
  from: string;
  to: string;
  value: string;
  token_info?: { address?: string; symbol?: string; decimals?: number };
}

interface TrxTransaction {
  txID: string;
  blockNumber?: number;
  block_timestamp?: number;
  ret?: { contractRet?: string }[];
  raw_data?: {
    contract?: {
      type?: string;
      parameter?: { value?: { owner_address?: string; to_address?: string; amount?: number } };
    }[];
  };
}

function tokenContract(asset: AssetId): string {
  const contract = ASSETS[asset].contract;
  if (!contract) throw new Error(`Asset ${asset} has no contract address.`);
  return contract;
}

/** CoinGecko ids for the assets this chain serves. */
const PRICE_IDS: Partial<Record<AssetId, string>> = { tron: "tron", "usdt-tron": "tether" };

/* ------------------------------------------------------------------ TRC-20 */

function transferToTransaction(
  transfer: Trc20Transfer,
  address: string,
  asset: AssetId,
  price: number | null,
): Transaction {
  const value = BigInt(transfer.value || "0");
  const isOut = transfer.from === address;
  const isIn = transfer.to === address;

  return {
    chain: "tron",
    hash: transfer.transaction_id,
    height: null,
    timestamp: transfer.block_timestamp
      ? new Date(transfer.block_timestamp).toISOString()
      : null,
    confirmed: true,
    // Fees on TRON are paid in burned TRX or in staked bandwidth and energy,
    // neither of which is denominated in the token being moved.
    fee: makeValue(0n, asset, price),
    totalValue: makeValue(value, asset, price),
    inputs: [{ address: transfer.from ?? null, value: makeValue(value, asset, price) }],
    outputs: [{ address: transfer.to ?? null, value: makeValue(value, asset, price) }],
    netForAddress: makeValue(isOut && !isIn ? -value : isIn && !isOut ? value : 0n, asset, price),
    direction: isOut && isIn ? "self" : isOut ? "out" : isIn ? "in" : "self",
  };
}

/* -------------------------------------------------------------- native TRX */

/**
 * Pulls the payments out of a raw transaction list.
 *
 * Only `TransferContract` moves TRX between accounts. The rest of what this
 * endpoint returns — freezing, delegating, voting, resource bookkeeping — is
 * account administration, and counting it as flow would inflate every degree
 * and volume on the page with transfers that never happened.
 */
function nativePayments(
  transactions: TrxTransaction[],
  address: string,
): { hash: string; from: string | null; to: string | null; amount: bigint; at: string | null; ok: boolean }[] {
  const payments = [];
  for (const transaction of transactions) {
    const contract = transaction.raw_data?.contract?.[0];
    if (contract?.type !== "TransferContract") continue;
    const value = contract.parameter?.value;
    if (!value) continue;

    payments.push({
      hash: transaction.txID,
      from: fromHex(value.owner_address),
      to: fromHex(value.to_address),
      amount: BigInt(value.amount ?? 0),
      at: transaction.block_timestamp
        ? new Date(transaction.block_timestamp).toISOString()
        : null,
      ok: transaction.ret?.[0]?.contractRet === "SUCCESS",
    });
  }
  void address;
  return payments;
}

/* ------------------------------------------------------------- aggregation */

interface Movement {
  hash: string;
  from: string | null;
  to: string | null;
  amount: bigint;
  at: string | null;
}

function aggregateNeighbors(movements: Movement[], address: string): NeighborAgg[] {
  const byKey = new Map<string, NeighborAgg>();

  for (const movement of movements) {
    let counterparty: string | null = null;
    let direction: "in" | "out" | null = null;
    if (movement.from === address && movement.to && movement.to !== address) {
      counterparty = movement.to;
      direction = "out";
    } else if (movement.to === address && movement.from && movement.from !== address) {
      counterparty = movement.from;
      direction = "in";
    }
    if (!counterparty || !direction) continue;

    const key = `${direction}:${counterparty}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.txCount += 1;
      existing.valueRaw += movement.amount;
      if (movement.at) {
        if (!existing.firstSeen || movement.at < existing.firstSeen) existing.firstSeen = movement.at;
        if (!existing.lastSeen || movement.at > existing.lastSeen) existing.lastSeen = movement.at;
      }
      continue;
    }
    byKey.set(key, {
      address: counterparty,
      direction,
      txCount: 1,
      valueRaw: movement.amount,
      firstSeen: movement.at,
      lastSeen: movement.at,
      // TronGrid attaches no label to a counterparty; attribution comes from
      // this app's own tag packs downstream.
      label: null,
      isContract: false,
    });
  }

  return [...byKey.values()].sort((a, b) =>
    b.valueRaw > a.valueRaw ? 1 : b.valueRaw < a.valueRaw ? -1 : 0,
  );
}

/* ----------------------------------------------------------------- adapter */

export const tronAdapter: ChainAdapter = {
  chain: "tron",

  async getPrice(asset: AssetId = "tron"): Promise<PriceInfo> {
    const id = PRICE_IDS[asset];
    if (!id) return { usd: null, change24h: null };
    return cached(`tron:price:${asset}`, 60_000, async () => {
      const data = await fetchJson<Record<string, { usd?: number }>>(
        `${PRICE}?ids=${id}&vs_currencies=usd`,
      ).catch(() => null);
      return { usd: data?.[id]?.usd ?? null, change24h: null };
    });
  },

  /** TRON has no name service this app reads, so an address is itself. */
  async resolve(query: string) {
    return query.trim();
  },

  async getAddressBundle(
    address: string,
    limit: number,
    asset: AssetId = "tron",
  ): Promise<AddressBundle> {
    return cached(`tron:bundle:${asset}:${address}:${limit}`, 45_000, async () => {
      const meta = ASSETS[asset];
      const encoded = encodeURIComponent(address);

      const [{ usd: price }, account] = await Promise.all([
        tronAdapter.getPrice(asset),
        fetchJson<{ data?: TrxAccount[] }>(`${API}/v1/accounts/${encoded}`).catch(() => null),
      ]);
      const info = account?.data?.[0];

      if (meta.kind === "trc20") {
        const contract = tokenContract(asset);
        const result = await fetchJson<{ data?: Trc20Transfer[] }>(
          `${API}/v1/accounts/${encoded}/transactions/trc20?limit=${Math.min(limit, 200)}&contract_address=${contract}`,
          { timeoutMs: 20_000, retries: 0 },
        )
          .then((value) => ({ items: value.data ?? [], error: null as string | null }))
          .catch((error: unknown) => ({
            items: [] as Trc20Transfer[],
            error: error instanceof Error ? error.message : "transfer list unavailable",
          }));

        const transfers = result.items.slice(0, limit);
        const movements: Movement[] = transfers.map((transfer) => ({
          hash: transfer.transaction_id,
          from: transfer.from,
          to: transfer.to,
          amount: BigInt(transfer.value || "0"),
          at: transfer.block_timestamp ? new Date(transfer.block_timestamp).toISOString() : null,
        }));

        let receivedRaw = 0n;
        let sentRaw = 0n;
        for (const movement of movements) {
          if (movement.to === address && movement.from !== address) receivedRaw += movement.amount;
          if (movement.from === address && movement.to !== address) sentRaw += movement.amount;
        }

        // The account endpoint reports every TRC-20 balance as a one-key object
        // keyed by contract; pick out the one being analysed.
        const holding = (info?.trc20 ?? []).find((entry) => contract in entry);
        const timestamps = movements
          .map((movement) => movement.at)
          .filter((value): value is string => Boolean(value))
          .sort();

        return {
          chain: "tron",
          asset,
          address,
          balanceRaw: BigInt(holding?.[contract] ?? "0"),
          receivedRaw,
          sentRaw,
          txCount: transfers.length,
          isContract: false,
          label: null,
          publicTags: [],
          firstSeen: timestamps[0] ?? null,
          lastSeen: timestamps[timestamps.length - 1] ?? null,
          txs: transfers.map((transfer) =>
            transferToTransaction(transfer, address, asset, price),
          ),
          neighbors: aggregateNeighbors(movements, address),
          cluster: {
            id: `tron:${address}`,
            method: "account-identity",
            addresses: [address],
            partial: false,
          },
          tokenImpersonators: [],
          totalsWindowed: true,
          windowSize: transfers.length,
          txsUnavailable: result.error,
        } satisfies AddressBundle;
      }

      const result = await fetchJson<{ data?: TrxTransaction[] }>(
        `${API}/v1/accounts/${encoded}/transactions?limit=${Math.min(limit, 200)}`,
        { timeoutMs: 20_000, retries: 0 },
      )
        .then((value) => ({ items: value.data ?? [], error: null as string | null }))
        .catch((error: unknown) => ({
          items: [] as TrxTransaction[],
          error: error instanceof Error ? error.message : "transaction list unavailable",
        }));

      // A reverted transfer moved nothing; including it would credit value that
      // never arrived.
      const payments = nativePayments(result.items, address).filter((payment) => payment.ok);
      const movements: Movement[] = payments.map((payment) => ({
        hash: payment.hash,
        from: payment.from,
        to: payment.to,
        amount: payment.amount,
        at: payment.at,
      }));

      let receivedRaw = 0n;
      let sentRaw = 0n;
      for (const movement of movements) {
        if (movement.to === address && movement.from !== address) receivedRaw += movement.amount;
        if (movement.from === address && movement.to !== address) sentRaw += movement.amount;
      }

      const timestamps = movements
        .map((movement) => movement.at)
        .filter((value): value is string => Boolean(value))
        .sort();

      return {
        chain: "tron",
        asset,
        address,
        balanceRaw: BigInt(info?.balance ?? 0),
        receivedRaw,
        sentRaw,
        txCount: movements.length,
        isContract: false,
        label: null,
        publicTags: [],
        firstSeen: timestamps[0] ?? null,
        lastSeen: timestamps[timestamps.length - 1] ?? null,
        txs: movements.map((movement) => ({
          chain: "tron" as const,
          hash: movement.hash,
          height: null,
          timestamp: movement.at,
          confirmed: true,
          fee: makeValue(0n, asset, price),
          totalValue: makeValue(movement.amount, asset, price),
          inputs: [{ address: movement.from, value: makeValue(movement.amount, asset, price) }],
          outputs: [{ address: movement.to, value: makeValue(movement.amount, asset, price) }],
          netForAddress: makeValue(
            movement.from === address ? -movement.amount : movement.amount,
            asset,
            price,
          ),
          direction:
            movement.from === address && movement.to === address
              ? ("self" as const)
              : movement.from === address
                ? ("out" as const)
                : ("in" as const),
        })),
        neighbors: aggregateNeighbors(movements, address),
        cluster: {
          id: `tron:${address}`,
          method: "account-identity",
          addresses: [address],
          partial: false,
        },
        tokenImpersonators: [],
        totalsWindowed: true,
        windowSize: movements.length,
        txsUnavailable: result.error,
      } satisfies AddressBundle;
    });
  },

  async getStats(): Promise<ChainStats> {
    return cached("tron:stats", 60_000, async () => {
      const [{ usd }, status] = await Promise.all([
        tronAdapter.getPrice("tron"),
        fetchJson<{ database?: { block?: number } }>(`${TRONSCAN}/system/status`).catch(() => null),
      ]);

      return {
        chain: "tron",
        blockHeight: status?.database?.block ?? 0,
        priceUsd: usd,
        priceChange24h: null,
        txCount24h: null,
        // TRON charges bandwidth and energy rather than a per-transaction fee in
        // TRX, so there is no average fee comparable to the other chains here.
        avgFee: null,
        mempoolSize: null,
        series: [],
        seriesLabel: "",
        seriesUnit: "",
      } satisfies ChainStats;
    });
  },
};
