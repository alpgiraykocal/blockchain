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
  // Per-chain copy and colour, in one place. A lookup rather than a chain of
  // ternaries: the binary form quietly gave every chain that was not Bitcoin
  // Ethereum's labels, which was correct only while there were two of them.
  const byChain = {
    btc: {
      series: t.seriesBtc,
      unit: t.unitBtc,
      throughput: t.mempool,
      throughputValue: stats.mempoolSize,
      throughputHint: t.unconfirmedTxs,
      feeHint: t.avgFeeHintBtc,
      colour: "var(--accent)",
    },
    eth: {
      series: t.seriesEth,
      unit: t.unitEth,
      throughput: t.txsToday,
      throughputValue: stats.txCount24h,
      throughputHint: t.last24h,
      feeHint: t.avgFeeHintEth,
      colour: "var(--secondary)",
    },
    tron: {
      series: t.seriesTron,
      unit: t.unitTron,
      throughput: t.txsToday,
      throughputValue: stats.txCount24h,
      throughputHint: t.last24h,
      feeHint: t.avgFeeHintTron,
      colour: "var(--primary)",
    },
  }[stats.chain];

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
          label={byChain.throughput}
          icon={<Activity className="size-3" aria-hidden="true" />}
          value={formatNumber(byChain.throughputValue, true)}
          secondary={byChain.throughputHint}
        />
        <StatTile
          label={t.avgFee}
          icon={<Fuel className="size-3" aria-hidden="true" />}
          value={stats.avgFee ? formatUsd(stats.avgFee.usd) : "—"}
          secondary={stats.avgFee ? formatCoin(stats.avgFee, stats.chain) : undefined}
          hint={byChain.feeHint}
        />
      </div>

      {/* A chain with no published series gets a line saying so rather than an
          empty chart frame, which reads as a failed fetch. */}
      <div className="mt-4">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
          {byChain.series}
        </p>
        {stats.series.length ? (
          <TrendChartLazy
            points={stats.series}
            label={byChain.series}
            unit={byChain.unit}
            color={byChain.colour}
            height={180}
          />
        ) : (
          <p className="flex h-[180px] items-center justify-center text-xs text-foreground-muted">
            {t.noSeries}
          </p>
        )}
      </div>
    </Panel>
  );
}
