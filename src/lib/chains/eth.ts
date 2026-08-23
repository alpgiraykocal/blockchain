import { cached } from "../cache";
import { ASSETS } from "./registry";
import { findImpersonations } from "./homoglyph";
import { fetchJson } from "../http";
import { makeValue } from "../format";
import type { AssetId, ChainStats, TimePoint, Transaction } from "../types";
import type {
  AddressBundle,
  ChainAdapter,
  NeighborAgg,
  PriceInfo,
} from "./adapter";

const API = "https://eth.blockscout.com/api/v2";

/** Mirrors `ETH_ENS` in the registry: what the address grammar accepts as a name. */
const ETH_NAME = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i;

interface BsAddressRef {
  hash: string;
  name: string | null;
  ens_domain_name: string | null;
  is_contract: boolean;
  is_scam: boolean;
  public_tags?: { display_name?: string }[];
  metadata?: { tags?: { name: string; tagType?: string; slug?: string }[] } | null;
}

interface BsAddress extends BsAddressRef {
  coin_balance: string;
  exchange_rate: string | null;
  block_number_balance_updated_at: number | null;
}

interface BsCounters {
  transactions_count: string;
  token_transfers_count: string;
  gas_usage_count: string;
}

interface BsTx {
  hash: string;
  block_number: number | null;
  timestamp: string | null;
  value: string;
  fee: { value: string } | null;
  status: string | null;
  method: string | null;
  from: BsAddressRef;
  to: BsAddressRef | null;
}

interface BsStats {
  coin_price: string | null;
  coin_price_change_percentage: number | null;
  total_blocks: string;
  transactions_today: string;
  gas_prices: { slow: number; average: number; fast: number } | null;
  average_block_time: number | null;
  network_utilization_percentage: number | null;
}

function labelOf(ref: BsAddressRef | null | undefined): string | null {
  if (!ref) return null;
  const metaName = ref.metadata?.tags?.find((tag) => tag.tagType === "name")?.name;
  return metaName ?? ref.name ?? ref.ens_domain_name ?? null;
}

function publicTagsOf(ref: BsAddressRef | null | undefined): string[] {
  if (!ref) return [];
  const fromMeta = (ref.metadata?.tags ?? []).map((tag) => tag.name).filter(Boolean);
  const fromPublic = (ref.public_tags ?? [])
    .map((tag) => tag.display_name)
    .filter((name): name is string => Boolean(name));
  return [...new Set([...fromMeta, ...fromPublic])];
}

function toTransaction(tx: BsTx, address: string, price: number | null): Transaction {
  const lower = address.toLowerCase();
  const from = tx.from?.hash?.toLowerCase() ?? null;
  const to = tx.to?.hash?.toLowerCase() ?? null;
  const value = BigInt(tx.value || "0");
  const fee = BigInt(tx.fee?.value || "0");

  let direction: "in" | "out" | "self" = "self";
  let net = 0n;
  if (from === lower && to === lower) {
    direction = "self";
    net = -fee;
  } else if (from === lower) {
    direction = "out";
    net = -(value + fee);
  } else if (to === lower) {
    direction = "in";
    net = value;
  }

  return {
    chain: "eth",
    hash: tx.hash,
    height: tx.block_number,
    timestamp: tx.timestamp,
    confirmed: tx.status !== null && tx.block_number !== null,
    fee: makeValue(fee, "eth", price),
    totalValue: makeValue(value, "eth", price),
    inputs: [{ address: tx.from?.hash ?? null, value: makeValue(value, "eth", price) }],
    outputs: [{ address: tx.to?.hash ?? null, value: makeValue(value, "eth", price) }],
    netForAddress: makeValue(net, "eth", price),
    direction,
  };
}

function aggregateNeighbors(txs: BsTx[], address: string): NeighborAgg[] {
  const lower = address.toLowerCase();
  const byKey = new Map<string, NeighborAgg>();

  for (const tx of txs) {
    const from = tx.from;
    const to = tx.to;
    const fromHash = from?.hash?.toLowerCase();
    const toHash = to?.hash?.toLowerCase();

    let counterparty: BsAddressRef | null = null;
    let direction: "in" | "out" | null = null;

    if (fromHash === lower && toHash && toHash !== lower) {
      counterparty = to;
      direction = "out";
    } else if (toHash === lower && fromHash && fromHash !== lower) {
      counterparty = from;
      direction = "in";
    }
    if (!counterparty || !direction) continue;

    const key = `${direction}:${counterparty.hash.toLowerCase()}`;
    const value = BigInt(tx.value || "0");
    const existing = byKey.get(key);
    if (existing) {
      existing.txCount += 1;
      existing.valueRaw += value;
      if (tx.timestamp) {
        if (!existing.firstSeen || tx.timestamp < existing.firstSeen) {
          existing.firstSeen = tx.timestamp;
        }
        if (!existing.lastSeen || tx.timestamp > existing.lastSeen) {
          existing.lastSeen = tx.timestamp;
        }
      }
      continue;
    }
    byKey.set(key, {
      address: counterparty.hash,
      direction,
      txCount: 1,
      valueRaw: value,
      firstSeen: tx.timestamp,
      lastSeen: tx.timestamp,
      label: labelOf(counterparty),
      isContract: Boolean(counterparty.is_contract),
    });
  }

  // Ties must compare equal. Returning -1 for them made this an inconsistent
  // comparator, which leaves the order of equal-value counterparties up to the
  // sort's internals rather than stable between two identical requests.
  return [...byKey.values()].sort((a, b) =>
    b.valueRaw > a.valueRaw ? 1 : b.valueRaw < a.valueRaw ? -1 : 0,
  );
}

interface BsTokenTransfer {
  transaction_hash: string;
  block_number: number | null;
  timestamp: string | null;
  method: string | null;
  from: BsAddressRef;
  to: BsAddressRef | null;
  total: { value: string; decimals: string | number } | null;
  token: { address_hash?: string; address?: string; symbol?: string; decimals?: string } | null;
}

interface BsTokenBalance {
  value: string;
  token: { address_hash?: string; address?: string; exchange_rate?: string | null };
}

function tokenContract(asset: AssetId): string {
  const contract = ASSETS[asset].contract;
  if (!contract) throw new Error(`Asset ${asset} has no contract address.`);
  return contract;
}

function transferToTransaction(
  transfer: BsTokenTransfer,
  address: string,
  asset: AssetId,
  price: number | null,
): Transaction {
  const lower = address.toLowerCase();
  const from = transfer.from?.hash?.toLowerCase() ?? null;
  const to = transfer.to?.hash?.toLowerCase() ?? null;
  const value = BigInt(transfer.total?.value || "0");

  let direction: "in" | "out" | "self" = "self";
  let net = 0n;
  if (from === lower && to === lower) direction = "self";
  else if (from === lower) {
    direction = "out";
    net = -value;
  } else if (to === lower) {
    direction = "in";
    net = value;
  }

  return {
    chain: "eth",
    hash: transfer.transaction_hash,
    height: transfer.block_number,
    timestamp: transfer.timestamp,
    confirmed: transfer.block_number !== null,
    // The gas that carried this transfer was paid in ETH, not in the token, so
    // there is no fee to state in the token's own units. Reporting the ETH cost
    // in a USDT column would be a category error.
    fee: makeValue(0n, asset, price),
    totalValue: makeValue(value, asset, price),
    inputs: [{ address: transfer.from?.hash ?? null, value: makeValue(value, asset, price) }],
    outputs: [{ address: transfer.to?.hash ?? null, value: makeValue(value, asset, price) }],
    netForAddress: makeValue(net, asset, price),
    direction,
  };
}

function aggregateTokenNeighbors(
  transfers: BsTokenTransfer[],
  address: string,
): NeighborAgg[] {
  const lower = address.toLowerCase();
  const byKey = new Map<string, NeighborAgg>();

  for (const transfer of transfers) {
    const from = transfer.from;
    const to = transfer.to;
    const fromHash = from?.hash?.toLowerCase();
    const toHash = to?.hash?.toLowerCase();

    let counterparty: BsAddressRef | null = null;
    let direction: "in" | "out" | null = null;
    if (fromHash === lower && toHash && toHash !== lower) {
      counterparty = to;
      direction = "out";
    } else if (toHash === lower && fromHash && fromHash !== lower) {
      counterparty = from;
      direction = "in";
    }
    if (!counterparty || !direction) continue;

    const key = `${direction}:${counterparty.hash.toLowerCase()}`;
    const value = BigInt(transfer.total?.value || "0");
    const existing = byKey.get(key);
    if (existing) {
      existing.txCount += 1;
      existing.valueRaw += value;
      if (transfer.timestamp) {
        if (!existing.firstSeen || transfer.timestamp < existing.firstSeen) {
          existing.firstSeen = transfer.timestamp;
        }
        if (!existing.lastSeen || transfer.timestamp > existing.lastSeen) {
          existing.lastSeen = transfer.timestamp;
        }
      }
      continue;
    }
    byKey.set(key, {
      address: counterparty.hash,
      direction,
      txCount: 1,
      valueRaw: value,
      firstSeen: transfer.timestamp,
      lastSeen: transfer.timestamp,
      label: labelOf(counterparty),
      isContract: Boolean(counterparty.is_contract),
    });
  }

  return [...byKey.values()].sort((a, b) =>
    b.valueRaw > a.valueRaw ? 1 : b.valueRaw < a.valueRaw ? -1 : 0,
  );
}

/**
 * A token bundle.
 *
 * Every request is pinned to the contract address rather than the symbol. The
 * explorer will happily return four different contracts all calling themselves
 * USDT through Unicode lookalikes; asking for the contract is what keeps a scam
 * airdrop out of a balance an analyst is about to act on.
 */
async function tokenBundle(
  address: string,
  limit: number,
  asset: AssetId,
): Promise<AddressBundle> {
  const contract = tokenContract(asset);
  const encoded = encodeURIComponent(address);

  const [balances, transferResult, mixedPage] = await Promise.all([
    fetchJson<{ items?: BsTokenBalance[] }>(
      `${API}/addresses/${encoded}/tokens?type=ERC-20`,
    ).catch(() => null),
    fetchJson<{ items?: BsTokenTransfer[] }>(
      `${API}/addresses/${encoded}/token-transfers?token=${contract}&type=ERC-20`,
      { timeoutMs: 20_000, retries: 0 },
    )
      .then((value) => ({ items: value.items ?? [], error: null as string | null }))
      .catch((error: unknown) => ({
        items: [] as BsTokenTransfer[],
        error: error instanceof Error ? error.message : "token transfer list unavailable",
      })),
    // A second, unfiltered page. The analysis itself must stay pinned to the
    // contract, but impersonators are by definition the tokens that pinning
    // filters out - so they can only be seen by looking at what else arrived.
    fetchJson<{ items?: BsTokenTransfer[] }>(
      `${API}/addresses/${encoded}/token-transfers?type=ERC-20`,
      { timeoutMs: 15_000, retries: 0 },
    ).catch(() => null),
  ]);

  const holding = (balances?.items ?? []).find(
    (entry) =>
      (entry.token?.address_hash ?? entry.token?.address ?? "").toLowerCase() ===
      contract.toLowerCase(),
  );
  // The explorer quotes the token's own rate. A stablecoin is not assumed to be
  // worth a dollar - it is worth what it is trading at, which is the figure an
  // analyst needs when it depegs.
  const price = holding?.token?.exchange_rate ? Number(holding.token.exchange_rate) : null;

  const transfers = transferResult.items.slice(0, limit);
  const lower = address.toLowerCase();

  let receivedRaw = 0n;
  let sentRaw = 0n;
  for (const transfer of transfers) {
    const value = BigInt(transfer.total?.value || "0");
    const from = transfer.from?.hash?.toLowerCase();
    const to = transfer.to?.hash?.toLowerCase();
    if (to === lower && from !== lower) receivedRaw += value;
    if (from === lower && to !== lower) sentRaw += value;
  }

  const timestamps = transfers
    .map((transfer) => transfer.timestamp)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    chain: "eth",
    asset,
    address,
    balanceRaw: BigInt(holding?.value ?? "0"),
    receivedRaw,
    sentRaw,
    txCount: transfers.length,
    isContract: false,
    label: null,
    publicTags: [],
    firstSeen: timestamps[0] ?? null,
    lastSeen: timestamps[timestamps.length - 1] ?? null,
    txs: transfers.map((transfer) => transferToTransaction(transfer, address, asset, price)),
    neighbors: aggregateTokenNeighbors(transfers, address),
    cluster: {
      id: `eth:${lower}`,
      method: "account-identity",
      addresses: [address],
      partial: false,
    },
    tokenImpersonators: findImpersonations(
      (mixedPage?.items ?? []).map((item) => ({
        symbol: item.token?.symbol,
        contract: item.token?.address_hash ?? item.token?.address,
      })),
    ),
    totalsWindowed: true,
    windowSize: transfers.length,
    txsUnavailable: transferResult.error,
  } satisfies AddressBundle;
}

export const ethAdapter: ChainAdapter = {
  chain: "eth",

  async getPrice(asset: AssetId = "eth"): Promise<PriceInfo> {
    if (ASSETS[asset].kind === "erc20") {
      const contract = tokenContract(asset);
      return cached(`eth:price:${asset}`, 60_000, async () => {
        const token = await fetchJson<{ exchange_rate?: string | null }>(
          `${API}/tokens/${contract}`,
        ).catch(() => null);
        // No 24h series for a token here, and a made-up zero would read as a
        // flat price rather than as an absent one.
        return { usd: token?.exchange_rate ? Number(token.exchange_rate) : null, change24h: null };
      });
    }
    return cached("eth:price", 60_000, async () => {
      const stats = await fetchJson<BsStats>(`${API}/stats`);
      return {
        usd: stats.coin_price ? Number(stats.coin_price) : null,
        change24h: stats.coin_price_change_percentage ?? null,
      };
    });
  },

  async resolve(query: string) {
    const value = query.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(value)) return value;
    // Only a name-shaped query goes to the search index. Blockscout answers a
    // malformed one - `0xZZZ`, a truncated paste - with its closest fuzzy match,
    // and returning that would report confidently on a stranger's address.
    if (!ETH_NAME.test(value)) return null;
    // ENS names are resolved through Blockscout's search index.
    const result = await fetchJson<{ items?: { address_hash?: string; address?: string }[] }>(
      `${API}/search?q=${encodeURIComponent(value)}`,
    ).catch(() => null);
    const hit = result?.items?.find((item) => item.address_hash ?? item.address);
    return hit?.address_hash ?? hit?.address ?? null;
  },

  async getAddressBundle(
    address: string,
    limit: number,
    asset: AssetId = "eth",
  ): Promise<AddressBundle> {
    if (ASSETS[asset].kind === "erc20") {
      return cached(`eth:bundle:${asset}:${address}:${limit}`, 45_000, () =>
        tokenBundle(address, limit, asset),
      );
    }
    return cached(`eth:bundle:${address}:${limit}`, 45_000, async () => {
      const encoded = encodeURIComponent(address);
      const [{ usd: price }, info, counters, txResult] = await Promise.all([
        ethAdapter.getPrice(),
        fetchJson<BsAddress>(`${API}/addresses/${encoded}`),
        fetchJson<BsCounters>(`${API}/addresses/${encoded}/counters`).catch(() => null),
        // A slow or failed tx page must not cost the whole report.
        fetchJson<{ items: BsTx[] }>(`${API}/addresses/${encoded}/transactions`, {
          timeoutMs: 20_000,
          retries: 0,
        })
          .then((value) => ({ items: value.items ?? [], error: null as string | null }))
          .catch((error: unknown) => ({
            items: [] as BsTx[],
            error: error instanceof Error ? error.message : "transaction list unavailable",
          })),
      ]);

      const txs = txResult.items.slice(0, limit);
      const lower = address.toLowerCase();

      let receivedRaw = 0n;
      let sentRaw = 0n;
      for (const tx of txs) {
        const value = BigInt(tx.value || "0");
        const from = tx.from?.hash?.toLowerCase();
        const to = tx.to?.hash?.toLowerCase();
        if (to === lower && from !== lower) receivedRaw += value;
        if (from === lower && to !== lower) sentRaw += value + BigInt(tx.fee?.value || "0");
      }

      const timestamps = txs
        .map((tx) => tx.timestamp)
        .filter((value): value is string => Boolean(value))
        .sort();

      return {
        chain: "eth",
        asset: "eth",
        address: info.hash ?? address,
        balanceRaw: BigInt(info.coin_balance || "0"),
        receivedRaw,
        sentRaw,
        txCount: counters ? Number(counters.transactions_count) : txs.length,
        isContract: Boolean(info.is_contract),
        label: labelOf(info),
        publicTags: publicTagsOf(info),
        firstSeen: timestamps[0] ?? null,
        lastSeen: timestamps[timestamps.length - 1] ?? null,
        txs: txs.map((tx) => toTransaction(tx, address, price)),
        neighbors: aggregateNeighbors(txs, address),
        cluster: {
          // Account-model chains have no co-spend signal: one address is one entity
          // unless an analyst merges them manually.
          id: `eth:${(info.hash ?? address).toLowerCase()}`,
          method: "account-identity",
          addresses: [info.hash ?? address],
          partial: false,
        },
        tokenImpersonators: [],
        totalsWindowed: true,
        windowSize: txs.length,
        txsUnavailable: txResult.error,
      } satisfies AddressBundle;
    });
  },

  async getStats(): Promise<ChainStats> {
    return cached("eth:stats", 60_000, async () => {
      const [stats, chart] = await Promise.all([
        fetchJson<BsStats>(`${API}/stats`),
        fetchJson<{ chart_data?: { date: string; transactions_count: number }[] }>(
          `${API}/stats/charts/transactions`,
        ).catch(() => null),
      ]);

      const price = stats.coin_price ? Number(stats.coin_price) : null;
      const series: TimePoint[] = (chart?.chart_data ?? [])
        .slice(0, 60)
        .reverse()
        .map((point) => ({ t: new Date(point.date).toISOString(), v: point.transactions_count }));

      const gwei = stats.gas_prices?.average ?? null;
      // 21_000 gas is the baseline transfer cost — a comparable "average fee" figure.
      const avgFeeWei = gwei == null ? null : BigInt(Math.round(gwei * 1e9)) * 21_000n;

      return {
        chain: "eth",
        blockHeight: Number(stats.total_blocks) || 0,
        priceUsd: price,
        priceChange24h: stats.coin_price_change_percentage ?? null,
        txCount24h: Number(stats.transactions_today) || null,
        avgFee: avgFeeWei == null ? null : makeValue(avgFeeWei, "eth", price),
        mempoolSize: null,
        series,
        seriesLabel: "Transactions per day",
        seriesUnit: "tx",
      } satisfies ChainStats;
    });
  },
};
