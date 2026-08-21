"use client";

import { Activity, Boxes, Coins, Fuel } from "lucide-react";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatTile } from "@/components/ui/stat-tile";
import { Badge, Panel } from "@/components/ui/primitives";
import { CHAINS } from "@/lib/chains/registry";
import { formatCoin, formatNumber, formatUsd } from "@/lib/format";
import type { ChainStats } from "@/lib/types";

export function ChainStatsCard({ stats }: { stats: ChainStats }) {
  const meta = CHAINS[stats.chain];

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          {meta.name}
          <Badge tone="neutral">{meta.ticker}</Badge>
        </span>
      }
      description={`Live from ${meta.explorerName}`}
      actions={
        <span className="tnum text-sm font-semibold text-foreground">
          {formatUsd(stats.priceUsd)}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0 lg:grid-cols-4">
        <StatTile
          label="Price"
          icon={<Coins className="size-3" aria-hidden="true" />}
          value={formatUsd(stats.priceUsd)}
          delta={stats.priceChange24h}
          secondary={stats.priceChange24h == null ? "24h change n/a" : "24h"}
        />
        <StatTile
          label="Block height"
          icon={<Boxes className="size-3" aria-hidden="true" />}
          value={formatNumber(stats.blockHeight)}
        />
        <StatTile
          label={stats.chain === "btc" ? "Mempool" : "Txs today"}
          icon={<Activity className="size-3" aria-hidden="true" />}
          value={formatNumber(
            stats.chain === "btc" ? stats.mempoolSize : stats.txCount24h,
            true,
          )}
          secondary={stats.chain === "btc" ? "unconfirmed txs" : "last 24h"}
        />
        <StatTile
          label="Avg fee"
          icon={<Fuel className="size-3" aria-hidden="true" />}
          value={stats.avgFee ? formatUsd(stats.avgFee.usd) : "—"}
          secondary={stats.avgFee ? formatCoin(stats.avgFee, stats.chain) : undefined}
          hint={
            stats.chain === "btc"
              ? "Mean fee per unconfirmed transaction in the mempool"
              : "Cost of a 21,000-gas transfer at the average gas price"
          }
        />
      </div>

      <div className="mt-4">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
          {stats.seriesLabel}
        </p>
        <TrendChart
          points={stats.series}
          label={stats.seriesLabel}
          unit={stats.seriesUnit}
          color={stats.chain === "btc" ? "var(--accent)" : "var(--secondary)"}
          height={180}
        />
      </div>
    </Panel>
  );
}
