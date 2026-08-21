"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Maximize2,
  Route,
  Trash2,
} from "lucide-react";
import { CHAINS } from "@/lib/chains/registry";
import { formatCoin, formatNumber, formatRelative, formatUsd, truncateAddress } from "@/lib/format";
import { useAddressAnalysis } from "@/hooks/use-address-analysis";
import type { GraphNode } from "@/lib/types";
import { CopyButton } from "@/components/ui/copy-button";
import { RiskBadge } from "@/components/ui/risk-badge";
import { TagChip } from "@/components/ui/tag-chip";
import {
  Button,
  Divider,
  EmptyState,
  ErrorState,
  Field,
  InlineLink,
  Skeleton,
} from "@/components/ui/primitives";

export function NodeInspector({
  node,
  isPathAnchor,
  onExpand,
  onRemove,
  onSetPathAnchor,
}: {
  node: GraphNode | null;
  isPathAnchor: boolean;
  onExpand: (node: GraphNode, direction: "both" | "in" | "out") => void;
  onRemove: (node: GraphNode) => void;
  onSetPathAnchor: (node: GraphNode | null) => void;
}) {
  const { data, loading, error, reload } = useAddressAnalysis(
    node?.chain ?? null,
    node?.address ?? null,
    50,
  );

  if (!node) {
    return (
      <EmptyState
        icon={<Maximize2 className="size-5" aria-hidden="true" />}
        title="No node selected"
        description="Click a node on the canvas to inspect its attribution, balance and risk signals. Double-click to expand its counterparties."
      />
    );
  }

  const meta = CHAINS[node.chain];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-heading">
              {node.label ?? truncateAddress(node.address, 10, 8)}
            </p>
            <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-foreground-muted">
              <span className="truncate">{truncateAddress(node.address, 12, 10)}</span>
              <CopyButton value={node.address} label="Copy address" />
            </p>
          </div>
          {data ? (
            <RiskBadge level={data.address.risk.level} score={data.address.risk.score} size="sm" />
          ) : null}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Button size="sm" variant="primary" onClick={() => onExpand(node, "both")}>
            <Maximize2 className="size-3.5" aria-hidden="true" />
            Expand
          </Button>
          <Button size="sm" onClick={() => onExpand(node, "in")}>
            <ArrowDownLeft className="size-3.5" aria-hidden="true" />
            Senders
          </Button>
          <Button size="sm" onClick={() => onExpand(node, "out")}>
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
            Receivers
          </Button>
          <Button
            size="sm"
            variant={isPathAnchor ? "primary" : "secondary"}
            aria-pressed={isPathAnchor}
            onClick={() => onSetPathAnchor(isPathAnchor ? null : node)}
          >
            <Route className="size-3.5" aria-hidden="true" />
            {isPathAnchor ? "Path anchor set" : "Set path anchor"}
          </Button>
          <Button size="sm" variant="danger" onClick={() => onRemove(node)}>
            <Trash2 className="size-3.5" aria-hidden="true" />
            Remove
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {loading && !data ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <ErrorState detail={error} onRetry={reload} />
        ) : data ? (
          <>
            <dl className="grid grid-cols-2 gap-x-4">
              <Field label="Balance">
                <span className="tnum">{formatCoin(data.address.balance, node.chain)}</span>
                <span className="ml-1 text-xs text-foreground-muted">
                  {formatUsd(data.address.balance.usd, true)}
                </span>
              </Field>
              <Field label="Transactions">
                <span className="tnum">{formatNumber(data.address.txCount)}</span>
              </Field>
              <Field label="Received">
                <span className="tnum text-success">
                  {formatCoin(data.address.totalReceived, node.chain)}
                </span>
              </Field>
              <Field label="Sent">
                <span className="tnum text-destructive">
                  {formatCoin(data.address.totalSent, node.chain)}
                </span>
              </Field>
              <Field label="In / out degree" hint="Distinct counterparties in the analysed window">
                <span className="tnum">
                  {data.address.inDegree} / {data.address.outDegree}
                </span>
              </Field>
              <Field label="Last activity">{formatRelative(data.address.lastSeen)}</Field>
            </dl>

            <Divider className="my-3" />

            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              Attribution
            </p>
            {data.address.tags.length ? (
              <div className="flex flex-wrap gap-1.5">
                {data.address.tags.map((tag) => (
                  <TagChip key={tag.id} tag={tag} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-foreground-muted">
                No TagPack entry matched this address.
              </p>
            )}

            <Divider className="my-3" />

            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              Risk signals
            </p>
            <ul className="space-y-1.5">
              {data.address.risk.signals.slice(0, 5).map((signal) => (
                <li
                  key={`${signal.code}-${signal.label}`}
                  className="rounded border border-border bg-surface-2/50 px-2 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">{signal.label}</span>
                    <span className="tnum text-[11px] text-foreground-muted">
                      +{signal.weight}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-foreground-muted">
                    {signal.detail}
                  </p>
                </li>
              ))}
            </ul>

            <Divider className="my-3" />

            <div className="flex flex-col gap-1.5 text-xs">
              <InlineLink href={`/address/${node.chain}/${node.address}`}>
                Open full address report
              </InlineLink>
              <InlineLink href={meta.explorerAddressUrl(node.address)} external>
                <span className="inline-flex items-center gap-1">
                  View on {meta.explorerName}
                  <ExternalLink className="size-3" aria-hidden="true" />
                </span>
              </InlineLink>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
