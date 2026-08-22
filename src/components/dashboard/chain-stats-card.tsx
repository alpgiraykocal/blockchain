"use client";

import { Activity, Boxes, Coins, Fuel } from "lucide-react";
import { TrendChartLazy } from "@/components/charts/trend-chart-lazy";
import { StatTile } from "@/components/ui/stat-tile";
import { Badge, Panel } from "@/components/ui/primitives";
import { CHAINS } from "@/lib/chains/registry";
import { useT } from "@/lib/i18n/context";
import { formatCoin, formatNumber, formatUsd } from "@/lib/format";
import type { ChainStats } from "@/lib/types";

export function ChainStatsCard({ stats }: { stats: ChainStats }) {
  const meta = CHAINS[stats.chain];
  const t = useT().ui.dashboard;
  const isBtc = stats.chain === "btc";
  // The series is fixed per chain, so it is translated here rather than by
  // making the cached stats endpoint locale-aware for two labels.
  const seriesLabel = isBtc ? t.seriesBtc : t.seriesEth;
  const seriesUnit = isBtc ? t.unitBtc : t.unitEth;

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          {meta.name}
          <Badge tone="neutral">{meta.ticker}</Badge>
        </span>
      }
      description={t.liveFrom(meta.explorerName)}
      actions={
        <span className="tnum text-sm font-semibold text-foreground">
          {formatUsd(stats.priceUsd)}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0 lg:grid-cols-4">
        <StatTile
          label={t.price}
          icon={<Coins className="size-3" aria-hidden="true" />}
          value={formatUsd(stats.priceUsd)}
          delta={stats.priceChange24h}
          secondary={stats.priceChange24h == null ? t.change24hNone : t.change24h}
        />
        <StatTile
          label={t.blockHeight}
          icon={<Boxes className="size-3" aria-hidden="true" />}
          value={formatNumber(stats.blockHeight)}
        />
        <StatTile
          label={isBtc ? t.mempool : t.txsToday}
          icon={<Activity className="size-3" aria-hidden="true" />}
          value={formatNumber(
            stats.chain === "btc" ? stats.mempoolSize : stats.txCount24h,
            true,
          )}
          secondary={isBtc ? t.unconfirmedTxs : t.last24h}
        />
        <StatTile
          label={t.avgFee}
          icon={<Fuel className="size-3" aria-hidden="true" />}
          value={stats.avgFee ? formatUsd(stats.avgFee.usd) : "—"}
          secondary={stats.avgFee ? formatCoin(stats.avgFee, stats.chain) : undefined}
          hint={
            isBtc ? t.avgFeeHintBtc : t.avgFeeHintEth
          }
        />
      </div>

      <div className="mt-4">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
          {seriesLabel}
        </p>
        <TrendChartLazy
          points={stats.series}
          label={seriesLabel}
          unit={seriesUnit}
          color={stats.chain === "btc" ? "var(--accent)" : "var(--secondary)"}
          height={180}
        />
      </div>
    </Panel>
  );
}
