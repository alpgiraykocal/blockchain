"use client";

import { formatCoin, formatUsd, truncateAddress } from "@/lib/format";
import type { ChainId } from "@/lib/types";
import type { NeighborRow } from "@/lib/analysis";
import { AddressLink } from "@/components/ui/address-link";
import { EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/** Horizontal value bars — a bar chart reads better than a pie for the long tail
 *  of counterparties, and each row stays directly labelled. */
export function FlowBars({
  rows,
  chain,
  direction,
  limit = 8,
}: {
  rows: NeighborRow[];
  chain: ChainId;
  direction: "in" | "out";
  limit?: number;
}) {
  const filtered = rows
    .filter((row) => row.direction === direction)
    .sort((a, b) => b.link.value.coin - a.link.value.coin)
    .slice(0, limit);

  if (!filtered.length) {
    return (
      <EmptyState
        title={direction === "in" ? "No senders observed" : "No receivers observed"}
        description="No counterparty of this direction appeared in the analysed transaction window."
      />
    );
  }

  const max = Math.max(...filtered.map((row) => row.link.value.coin)) || 1;

  return (
    <ul className="space-y-2">
      {filtered.map((row) => {
        const share = (row.link.value.coin / max) * 100;
        const risky = row.node.riskScore >= 40;
        return (
          <li key={`${row.direction}-${row.node.id}`} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <AddressLink
                chain={chain}
                address={row.node.address}
                label={row.node.label}
                className="truncate"
              />
              <span className="tnum shrink-0 text-foreground-muted">
                {formatCoin(row.link.value, chain)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div
                className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2"
                role="img"
                aria-label={`${truncateAddress(row.node.address)}: ${formatCoin(
                  row.link.value,
                  chain,
                )}, ${row.link.txCount} transactions`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300 ease-out",
                    risky ? "bg-destructive" : direction === "in" ? "bg-success" : "bg-secondary",
                  )}
                  style={{ width: `${Math.max(2, share)}%` }}
                />
              </div>
              <span className="tnum shrink-0 text-[11px] text-foreground-muted">
                {row.link.txCount} tx · {formatUsd(row.link.value.usd, true)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
