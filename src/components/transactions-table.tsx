"use client";

import { ArrowDownLeft, ArrowUpRight, ExternalLink, RefreshCcw } from "lucide-react";
import { CHAINS } from "@/lib/chains/registry";
import { formatCoin, formatDate, formatRelative, formatUsd, truncateAddress } from "@/lib/format";
import type { ChainId, Transaction } from "@/lib/types";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function TransactionsTable({
  transactions,
  chain,
}: {
  transactions: Transaction[];
  chain: ChainId;
}) {
  const { t: dict, locale } = useI18n();
  const t = dict.ui.transactions;
  const meta = CHAINS[chain];

  const columns: Column<Transaction>[] = [
    {
      key: "direction",
      header: "Dir",
      cell: (tx) => <DirectionBadge direction={tx.direction ?? "self"} />,
      sortValue: (tx) => tx.direction ?? "self",
    },
    {
      key: "hash",
      header: "Transaction",
      cell: (tx) => (
        <a
          href={meta.explorerTxUrl(tx.hash)}
          target="_blank"
          rel="noopener noreferrer"
          title={tx.hash}
          className="inline-flex cursor-pointer items-center gap-1 font-mono text-[13px] text-secondary transition-colors duration-150 hover:text-primary hover:underline"
        >
          {truncateAddress(tx.hash, 10, 8)}
          <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
        </a>
      ),
      sortValue: (tx) => tx.hash,
    },
    {
      key: "time",
      header: "Time",
      cell: (tx) => (
        <span title={formatDate(tx.timestamp, true, locale)} className="whitespace-nowrap">
          {tx.confirmed ? formatRelative(tx.timestamp, locale) : "pending"}
        </span>
      ),
      sortValue: (tx) => (tx.timestamp ? new Date(tx.timestamp).getTime() : 0),
    },
    {
      key: "net",
      header: t.netEffect,
      align: "right",
      cell: (tx) => {
        const net = tx.netForAddress;
        if (!net) return "—";
        const positive = net.coin > 0;
        return (
          <span
            className={cn(
              "tnum whitespace-nowrap font-medium",
              positive ? "text-success" : net.coin < 0 ? "text-destructive" : "text-foreground-muted",
            )}
          >
            {positive ? "+" : ""}
            {formatCoin(net, chain)}
          </span>
        );
      },
      sortValue: (tx) => tx.netForAddress?.coin ?? 0,
    },
    {
      key: "usd",
      header: "USD",
      align: "right",
      cell: (tx) => formatUsd(tx.netForAddress?.usd ?? null, true),
      sortValue: (tx) => Math.abs(tx.netForAddress?.usd ?? 0),
    },
    {
      key: "total",
      header: t.txVolume,
      align: "right",
      cell: (tx) => formatCoin(tx.totalValue, chain),
      sortValue: (tx) => tx.totalValue.coin,
      headerHint: t.txVolumeHint,
    },
    {
      key: "fee",
      header: "Fee",
      align: "right",
      cell: (tx) => formatCoin(tx.fee, chain),
      sortValue: (tx) => tx.fee.coin,
    },
    {
      key: "io",
      header: "In/Out",
      align: "right",
      cell: (tx) => (
        <span className="tnum whitespace-nowrap text-foreground-muted">
          {tx.inputs.length}/{tx.outputs.length}
        </span>
      ),
      sortValue: (tx) => tx.inputs.length + tx.outputs.length,
      headerHint: t.ioHint,
    },
  ];

  return (
    <DataTable
      rows={transactions}
      columns={columns}
      rowKey={(tx) => tx.hash}
      caption={t.caption}
      initialSort={{ key: "time", direction: "desc" }}
      emptyState={
        <EmptyState
          icon={<RefreshCcw className="size-5" aria-hidden="true" />}
          title={t.empty}
          description={t.emptyBody}
        />
      }
    />
  );
}

function DirectionBadge({ direction }: { direction: "in" | "out" | "self" }) {
  if (direction === "in") {
    return (
      <Badge tone="success" icon={<ArrowDownLeft className="size-3" aria-hidden="true" />}>
        In
      </Badge>
    );
  }
  if (direction === "out") {
    return (
      <Badge tone="danger" icon={<ArrowUpRight className="size-3" aria-hidden="true" />}>
        Out
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" icon={<RefreshCcw className="size-3" aria-hidden="true" />}>
      Self
    </Badge>
  );
}
