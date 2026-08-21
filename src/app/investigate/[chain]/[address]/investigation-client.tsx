"use client";

import {
  Activity,
  AlertOctagon,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Gauge,
  Network,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { CaseFile } from "@/components/aml/case-file";
import { FindingCard } from "@/components/aml/finding-card";
import { RadialGraph } from "@/components/aml/radial-graph";
import { AddressLink } from "@/components/ui/address-link";
import { CopyButton } from "@/components/ui/copy-button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Button, ErrorState, Panel } from "@/components/ui/primitives";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatTile } from "@/components/ui/stat-tile";
import { TagChip } from "@/components/ui/tag-chip";
import { DISPOSITION_LABEL } from "@/lib/aml/disposition";
import { pct } from "@/lib/aml/metrics";
import type { AmlAssessment, EgoNetwork, EgoNode } from "@/lib/aml/types";
import { CHAINS } from "@/lib/chains/registry";
import { jsonFetcher } from "@/lib/fetcher";
import { displayName, formatCoin, formatNumber, formatUsd, truncateAddress } from "@/lib/format";
import type { ChainId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Payload {
  assessment: AmlAssessment;
  network: EgoNetwork;
}

const ACTION_TONE = {
  escalate: "danger",
  "enhanced-review": "warning",
  monitor: "info",
  "no-action": "success",
} as const;

export function InvestigationClient({ chain, address }: { chain: ChainId; address: string }) {
  const [hop, setHop] = useState<1 | 2>(1);
  const [topK, setTopK] = useState(12);
  const [direction, setDirection] = useState<"both" | "in" | "out">("both");
  const [showHubs, setShowHubs] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const key = useMemo(() => {
    const params = new URLSearchParams({
      chain,
      address,
      hop: String(hop),
      topK: String(topK),
      direction,
    });
    if (showHubs) params.set("hubs", "all");
    return `/api/aml/assessment?${params}`;
  }, [chain, address, hop, topK, direction, showHubs]);

  const { data, error, isLoading, mutate } = useSWR<Payload>(key, jsonFetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
    dedupingInterval: 30_000,
  });

  const onExpand = useCallback((node: EgoNode) => {
    if (node.expandable) setHop(2);
  }, []);

  if (error && !data) {
    return (
      <Panel>
        <ErrorState
          title="Could not run the assessment"
          detail={error instanceof Error ? error.message : String(error)}
          onRetry={() => void mutate()}
        />
      </Panel>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24 rounded-lg" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div className="skeleton h-96 rounded-lg" />
          <div className="skeleton h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  const { assessment, network } = data;
  const { subject, disposition, metrics, findings } = assessment;
  const meta = CHAINS[chain];
  const selected = selectedId ? network.nodes.find((node) => node.id === selectedId) : null;

  const matched = findings.filter((f) => f.matched && f.weight > 0);
  const context = findings.filter((f) => f.matched && f.weight === 0);
  const clear = findings.filter((f) => !f.matched);

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------- header */}
      <header className="rounded-lg border border-border bg-surface px-4 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{meta.ticker}</Badge>
              {subject.isContract ? <Badge tone="accent">Contract</Badge> : null}
              <h1 className="min-w-0 text-lg font-semibold tracking-tight text-heading">
                {subject.label ? displayName(subject.label) : "Untagged address"}
              </h1>
            </div>
            <p className="mt-1 flex min-w-0 items-center gap-1">
              <span className="min-w-0 break-all font-mono text-xs text-foreground-muted">
                {subject.address}
              </span>
              <CopyButton value={subject.address} label="Copy address" />
            </p>
            {subject.tags.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {subject.tags.map((tag) => (
                  <TagChip key={tag.id} tag={tag} />
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={ACTION_TONE[disposition.action]} className="px-2 py-1 text-xs">
                {DISPOSITION_LABEL[disposition.action]}
              </Badge>
              <RiskBadge level={disposition.level} score={disposition.priority} />
            </div>
            <div className="flex flex-wrap gap-1.5 sm:justify-end">
              <Link
                href={`/address/${chain}/${subject.address}`}
                className="inline-flex h-9 min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border-strong px-2.5 text-xs font-medium text-foreground transition-colors duration-200 hover:bg-surface-2"
              >
                <Eye className="size-3.5" aria-hidden="true" />
                Address report
              </Link>
              <Link
                href={`/explorer?chain=${chain}&address=${subject.address}`}
                className="inline-flex h-9 min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border-strong px-2.5 text-xs font-medium text-foreground transition-colors duration-200 hover:bg-surface-2"
              >
                <Network className="size-3.5" aria-hidden="true" />
                Free-form graph
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* An assessment with no transaction data still renders a subject, a
          disposition and an empty ring. Without this banner that reads as a
          broken graph rather than as an upstream failure. */}
      {assessment.dataHealth.txsUnavailable ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/8 px-4 py-3"
        >
          <AlertOctagon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 text-[11px] leading-relaxed text-foreground-muted">
            <p className="text-xs font-medium text-foreground">
              No transaction data — the assessment below is incomplete
            </p>
            <p className="mt-0.5 break-words">
              {meta.explorerName} could not serve this address&apos;s transactions (
              {assessment.dataHealth.txsUnavailable}). Balance and attribution are still
              accurate; the ego network, every metric and every behavioural detector had
              nothing to run against, so an absent finding here means absent data, not a
              clear result.
            </p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={() => void mutate()}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------ disposition */}
      <section
        className={cn(
          "rounded-lg border px-4 py-3.5",
          disposition.action === "escalate"
            ? "border-destructive/50 bg-destructive/8"
            : disposition.action === "enhanced-review"
              ? "border-warning/50 bg-warning/8"
              : "border-border bg-surface",
        )}
      >
        <div className="flex items-start gap-2.5">
          {disposition.action === "escalate" ? (
            <AlertOctagon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          ) : (
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-foreground-muted" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{disposition.headline}</h2>
            <p className="mt-0.5 text-[11px] text-foreground-muted">
              Triage priority {disposition.priority}/100. This orders an analyst&apos;s queue; it is
              not a suspicious activity determination and does not trigger a filing.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <Column heading="Drivers" items={disposition.drivers} tone="danger" />
          <Column heading="Mitigating factors" items={disposition.mitigants} tone="muted" />
          <Column heading="Recommended next steps" items={disposition.nextSteps} tone="info" />
        </div>

        <details className="mt-3 rounded border border-border bg-surface-2/50 px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
            What would change this recommendation
          </summary>
          <ul className="mt-1.5 space-y-1">
            {disposition.wouldChangeIf.map((item, index) => (
              <li
                key={index}
                className="break-words text-[11px] leading-relaxed text-foreground-muted before:mr-1 before:content-['—']"
              >
                {item}
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* ---------------------------------------------------------- metrics */}
      <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0 lg:grid-cols-4 xl:grid-cols-6">
        <StatTile
          label="Counterparties"
          icon={<Users className="size-3" aria-hidden="true" />}
          value={formatNumber(metrics.degree)}
          secondary={`${metrics.inDegree} in · ${metrics.outDegree} out`}
        />
        <StatTile
          label="Received"
          icon={<ArrowDownLeft className="size-3" aria-hidden="true" />}
          value={formatCoin(metrics.inVolume, chain)}
          secondary={formatUsd(metrics.inVolume.usd, true)}
        />
        <StatTile
          label="Sent"
          icon={<ArrowUpRight className="size-3" aria-hidden="true" />}
          value={formatCoin(metrics.outVolume, chain)}
          secondary={formatUsd(metrics.outVolume.usd, true)}
        />
        <StatTile
          label="Retained"
          icon={<Gauge className="size-3" aria-hidden="true" />}
          value={pct(1 - metrics.passThroughRatio, 1)}
          secondary={`${pct(metrics.passThroughRatio, 1)} passed on`}
          hint="Share of everything received that is still held"
        />
        <StatTile
          label="Median dwell"
          icon={<Timer className="size-3" aria-hidden="true" />}
          value={
            metrics.medianDwellHours === null ? "—" : `${metrics.medianDwellHours.toFixed(1)} h`
          }
          secondary="inbound to next outbound"
        />
        <StatTile
          label="Burst"
          icon={<Activity className="size-3" aria-hidden="true" />}
          value={`${metrics.burstScore.toFixed(1)}x`}
          secondary={`${metrics.activeDays} active day(s)`}
          hint="Busiest day against the mean daily transaction count"
        />
      </div>

      {/* ------------------------------------------------- findings + graph */}
      <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Panel
          title="Typology findings"
          description={`${matched.length} matched · ${context.length} contextual · ${clear.length} not matched`}
        >
          <div className="space-y-2.5">
            {matched.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))}
            {context.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))}
            {clear.length ? (
              <details className="rounded border border-border bg-surface-2/40 px-3 py-2">
                <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  {clear.length} typologies tested and not matched
                </summary>
                <div className="mt-2 space-y-2">
                  {clear.map((finding) => (
                    <FindingCard key={finding.id} finding={finding} />
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            flush
            title="Ego network"
            description={`${network.nodes.length} nodes · ${network.edges.length} links · ${hop} hop`}
            actions={
              <div className="flex flex-wrap items-center gap-1.5">
                <Toggle
                  options={[
                    { value: "1", label: "1 hop" },
                    { value: "2", label: "2 hops" },
                  ]}
                  value={String(hop)}
                  onChange={(value) => setHop(value === "2" ? 2 : 1)}
                />
                <Toggle
                  options={[
                    { value: "both", label: "Both" },
                    { value: "in", label: "In" },
                    { value: "out", label: "Out" },
                  ]}
                  value={direction}
                  onChange={(value) => setDirection(value as typeof direction)}
                />
                <label className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                  Top-K
                  <select
                    value={topK}
                    onChange={(event) => setTopK(Number(event.target.value))}
                    className="h-9 cursor-pointer rounded border border-border bg-surface px-1.5 text-xs text-foreground"
                  >
                    {[6, 12, 20, 30].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  size="sm"
                  variant={showHubs ? "primary" : "secondary"}
                  aria-pressed={showHubs}
                  onClick={() => setShowHubs((current) => !current)}
                >
                  {showHubs ? "Hubs shown" : "Hubs damped"}
                </Button>
              </div>
            }
            className="min-h-[460px]"
          >
            <div className="flex h-full min-h-[460px] flex-col">
              <div className="relative min-h-0 flex-1 bg-surface-2/30">
                {network.nodes.length <= 1 ? (
                  <div className="flex h-full items-center justify-center p-6">
                    <div className="max-w-sm text-center">
                      <Network
                        className="mx-auto size-6 text-foreground-muted"
                        aria-hidden="true"
                      />
                      <p className="mt-2 text-sm font-medium text-foreground">
                        No counterparties to draw
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-foreground-muted">
                        {assessment.dataHealth.txsUnavailable
                          ? `${meta.explorerName} could not serve the transaction list, so there are no counterparties to place around the subject. Retry above.`
                          : direction !== "both"
                            ? `No ${direction === "in" ? "sending" : "receiving"} counterparties in the analysed window. Switch the direction filter back to Both.`
                            : `The subject has no counterparties in the ${assessment.dataHealth.txsAnalysed} transaction(s) the explorer returned. This is an empty window, not a cleared address.`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <RadialGraph
                    nodes={network.nodes}
                    edges={network.edges}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onExpand={onExpand}
                  />
                )}
                {isLoading ? (
                  <p className="pointer-events-none absolute left-3 top-3 rounded border border-border bg-surface/90 px-2 py-1 text-[11px] text-foreground-muted">
                    Re-running…
                  </p>
                ) : null}
                {selected ? (
                  <div className="absolute bottom-3 left-3 max-w-[min(20rem,calc(100%-1.5rem))] rounded-md border border-border bg-surface/95 p-2.5 text-[11px]">
                    <p className="truncate font-medium text-foreground">
                      {selected.label ?? truncateAddress(selected.address, 10, 8)}
                    </p>
                    <p className="tnum mt-0.5 text-foreground-muted">
                      Ring {selected.ring} · priority {selected.priority} · risk{" "}
                      {selected.riskScore} · {formatCoin(selected.value, chain)} over{" "}
                      {selected.txCount} tx
                    </p>
                    <AddressLink
                      chain={chain}
                      address={selected.address}
                      className="mt-1 inline-block"
                    />
                  </div>
                ) : null}
              </div>

              <div className="border-t border-border px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-foreground-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="size-2.5 rotate-45 border-2 border-ring"
                      aria-hidden="true"
                    />
                    Subject
                  </span>
                  <span>Ring 1 = direct counterparties</span>
                  <span>Ring 2 = one hop further</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full border-2 border-dashed border-border-strong"
                      aria-hidden="true"
                    />
                    Service hub, damped
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full border-2 border-destructive"
                      aria-hidden="true"
                    />
                    High risk
                  </span>
                </div>
                {network.reduction.length ? (
                  <p className="mt-1.5 text-[11px] text-warning">
                    Reduction applied:{" "}
                    {network.reduction
                      .map(
                        (step) =>
                          `${step.rule}${step.removed ? ` (−${step.removed})` : ""}`,
                      )
                      .join(", ")}
                    . The drawn network is a filtered view; metrics above are computed on the
                    unreduced set.
                  </p>
                ) : null}
                {network.incomplete.length ? (
                  <p className="mt-1 text-[11px] text-destructive">
                    {network.incomplete.length} expansion(s) failed and are missing from the
                    network.
                  </p>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel
            flush
            title="Counterparties"
            description="Text equivalent of the network, ordered by triage priority"
          >
            <CounterpartyTable nodes={network.nodes} chain={chain} onSelect={setSelectedId} />
          </Panel>
        </div>
      </div>

      <CaseFile assessment={assessment} />
    </div>
  );
}

/* ------------------------------------------------------------- helpers */

function Column({
  heading,
  items,
  tone,
}: {
  heading: string;
  items: string[];
  tone: "danger" | "muted" | "info";
}) {
  return (
    <div className="min-w-0">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
        {heading}
      </h3>
      <ul className="mt-1 space-y-1">
        {items.length ? (
          items.map((item, index) => (
            <li
              key={index}
              className={cn(
                "break-words text-[11px] leading-relaxed before:mr-1 before:content-['—']",
                tone === "danger" ? "text-foreground" : "text-foreground-muted",
              )}
            >
              {item}
            </li>
          ))
        ) : (
          <li className="text-[11px] text-foreground-muted">None recorded.</li>
        )}
      </ul>
    </div>
  );
}

function Toggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-8 cursor-pointer rounded px-2 text-[11px] font-medium transition-colors duration-150",
            value === option.value
              ? "bg-surface text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function CounterpartyTable({
  nodes,
  chain,
  onSelect,
}: {
  nodes: EgoNode[];
  chain: ChainId;
  onSelect: (id: string) => void;
}) {
  const rows = nodes.filter((node) => node.ring > 0);

  const columns: Column<EgoNode>[] = [
    {
      key: "priority",
      header: "Priority",
      align: "right",
      cell: (node) => <span className="tnum">{node.priority}</span>,
      sortValue: (node) => node.priority,
      headerHint: "Composite of risk, value share and recency. Triage aid only.",
    },
    {
      key: "ring",
      header: "Ring",
      align: "right",
      cell: (node) => <span className="tnum">{node.ring}</span>,
      sortValue: (node) => node.ring,
    },
    {
      key: "address",
      header: "Counterparty",
      cell: (node) => (
        <span className="flex items-center gap-1.5">
          <AddressLink chain={chain} address={node.address} label={node.label} />
          {node.isServiceHub ? <Badge tone="neutral">service</Badge> : null}
        </span>
      ),
      sortValue: (node) => node.label ?? node.address,
    },
    {
      key: "direction",
      header: "Dir",
      cell: (node) =>
        node.direction === "in" ? (
          <Badge tone="success">in</Badge>
        ) : node.direction === "out" ? (
          <Badge tone="danger">out</Badge>
        ) : (
          <Badge tone="neutral">{node.direction}</Badge>
        ),
      sortValue: (node) => node.direction,
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      cell: (node) => formatCoin(node.value, chain),
      sortValue: (node) => node.value.coin,
    },
    {
      key: "tx",
      header: "Txs",
      align: "right",
      cell: (node) => formatNumber(node.txCount),
      sortValue: (node) => node.txCount,
    },
    {
      key: "risk",
      header: "Risk",
      align: "right",
      cell: (node) => <RiskBadge level={node.riskLevel} score={node.riskScore} size="sm" />,
      sortValue: (node) => node.riskScore,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(node) => node.id}
      caption="Counterparties in the extracted ego network"
      initialSort={{ key: "priority", direction: "desc" }}
      onRowClick={(node) => onSelect(node.id)}
    />
  );
}
