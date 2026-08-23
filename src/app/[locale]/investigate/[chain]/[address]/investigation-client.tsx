"use client";

import {
  Activity,
  AlertOctagon,
  ArrowDownLeft,
  ArrowUpRight,
  Gauge,
  Network,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { CaseFile } from "@/components/aml/case-file";
import { FindingCard } from "@/components/aml/finding-card";
import { RadialGraphLazy } from "@/components/aml/radial-graph-lazy";
import { SubjectTabs } from "@/components/subject-tabs";
import { AddressLink } from "@/components/ui/address-link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Button, ErrorState, Panel } from "@/components/ui/primitives";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatTile } from "@/components/ui/stat-tile";
import { TagChip } from "@/components/ui/tag-chip";
import { pct } from "@/lib/aml/metrics";
import type { AmlAssessment, EgoNetwork, EgoNode } from "@/lib/aml/types";
import { ASSETS, CHAINS, assetsFor } from "@/lib/chains/registry";
import { jsonFetcher } from "@/lib/fetcher";
import { useI18n } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n/types";
import { displayName, formatCoin, formatNumber, formatUsd, truncateAddress } from "@/lib/format";
import type { AssetId, ChainId } from "@/lib/types";
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

type Copy = Dictionary["ui"]["investigation"];

export function InvestigationClient({ chain, address }: { chain: ChainId; address: string }) {
  const { t: dict, locale } = useI18n();
  const t: Copy = dict.ui.investigation;
  const [hop, setHop] = useState<1 | 2>(1);
  const [topK, setTopK] = useState(12);
  const [direction, setDirection] = useState<"both" | "in" | "out">("both");
  const [showHubs, setShowHubs] = useState(false);
  /**
   * Analyst time window: the days the label shows, and the instant it resolved to.
   *
   * The cutoff is pinned when the analyst picks it rather than recomputed from
   * `Date.now()` on each render. Two reasons: a value that moves every render
   * makes a new request key every render, and an audit record that says "the last
   * 30 days" without saying from when cannot be reproduced later.
   *
   * Null by default, deliberately. The published guidance for this pattern
   * suggests a 30-90 day default, but that assumes a store holding full history.
   * Here the explorer has already truncated to one page, so a second default
   * narrowing would compound two limits with no way to tell which one removed a
   * counterparty - and it would permanently silence the dormancy detector, which
   * needs at least 180 days of history to fire at all.
   */
  const [timeWindow, setTimeWindow] = useState<{ days: number; from: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Native by default. A token analysis is a different question about the same
  // address, not a refinement of the coin one, so the two never mix on a page.
  const [asset, setAsset] = useState<AssetId>(chain);
  const assets = useMemo(() => assetsFor(chain), [chain]);

  const key = useMemo(() => {
    const params = new URLSearchParams({
      chain,
      address,
      hop: String(hop),
      topK: String(topK),
      direction,
      // The findings, disposition and narrative are prose the analyst reads, so
      // the engine is told which language to write them in.
      locale,
    });
    if (showHubs) params.set("hubs", "all");
    if (asset !== chain) params.set("asset", asset);
    if (timeWindow) params.set("from", timeWindow.from);
    return `/api/aml/assessment?${params}`;
  }, [chain, address, hop, topK, direction, showHubs, timeWindow, asset, locale]);

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
      <div className="space-y-4">
        <SubjectTabs chain={chain} address={address} active="investigation" />
        <h1 className="text-lg font-semibold tracking-tight text-heading">
          {t.headline(truncateAddress(address, 10, 8))}
        </h1>
        <Panel>
        <ErrorState
          title={t.assessmentFailed}
          detail={error instanceof Error ? error.message : String(error)}
          onRetry={() => void mutate()}
        />
        </Panel>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <SubjectTabs chain={chain} address={address} active="investigation" />
        {/* The page must carry a heading before the data lands, or a screen
            reader meets an untitled document for the length of the fetch. */}
        <h1 className="text-lg font-semibold tracking-tight text-heading">
          {t.headline(truncateAddress(address, 10, 8))}
        </h1>
        <p className="text-xs text-foreground-muted">{t.running}</p>
        <div className="skeleton h-24 rounded-lg" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div className="skeleton h-96 rounded-lg" />
          <div className="skeleton h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  const { assessment, network } = data;
  // How many counterparties the analyst's own window removed, so the empty state
  // can name the control that did it rather than guessing.
  const windowDropped =
    network.reduction.find((step) => step.rule === "time-window")?.removed ?? 0;
  const { subject, disposition, metrics, findings } = assessment;
  const meta = CHAINS[chain];
  const selected = selectedId ? network.nodes.find((node) => node.id === selectedId) : null;

  const matched = findings.filter((f) => f.matched && f.weight > 0);
  const context = findings.filter((f) => f.matched && f.weight === 0);
  const clear = findings.filter((f) => !f.matched);

  return (
    <div className="space-y-4">
      <SubjectTabs chain={chain} address={subject.address} active="investigation" />

      {/* ---------------------------------------------------------- header */}
      <header className="rounded-lg border border-border bg-surface px-4 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{meta.ticker}</Badge>
              {/* Every figure below is denominated in the selected asset, so a
                  token analysis has to say so here. Showing only the chain's
                  ticker read as an ETH report on a page of USDT numbers. */}
              {asset !== chain ? <Badge tone="accent">{ASSETS[asset].symbol}</Badge> : null}
              {subject.isContract ? <Badge tone="accent">{t.contract}</Badge> : null}
              <h1 className="min-w-0 text-lg font-semibold tracking-tight text-heading">
                {subject.label ? displayName(subject.label) : t.untagged}
              </h1>
            </div>
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
                {dict.aml.dispositionLabel[disposition.action]}
              </Badge>
              <RiskBadge level={disposition.level} score={disposition.priority} />
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
              {t.noTxTitle}
            </p>
            <p className="mt-0.5 break-words">
              {t.noTxBody(meta.explorerName, assessment.dataHealth.txsUnavailable)}
            </p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={() => void mutate()}>
              {dict.ui.common.retry}
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
              {t.triagePriority(disposition.priority)}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <Column heading={t.drivers} items={disposition.drivers} tone="danger" empty={t.noneRecorded} />
          <Column heading={t.mitigants} items={disposition.mitigants} tone="muted" empty={t.noneRecorded} />
          <Column heading={t.nextSteps} items={disposition.nextSteps} tone="info" empty={t.noneRecorded} />
        </div>

        <details className="mt-3 rounded border border-border bg-surface-2/50 px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
            {t.wouldChange}
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
          label={t.counterparties}
          icon={<Users className="size-3" aria-hidden="true" />}
          value={formatNumber(metrics.degree)}
          secondary={t.inOut(metrics.inDegree, metrics.outDegree)}
        />
        <StatTile
          label={t.received}
          icon={<ArrowDownLeft className="size-3" aria-hidden="true" />}
          value={formatCoin(metrics.inVolume, asset)}
          secondary={formatUsd(metrics.inVolume.usd, true)}
        />
        <StatTile
          label={t.sent}
          icon={<ArrowUpRight className="size-3" aria-hidden="true" />}
          value={formatCoin(metrics.outVolume, asset)}
          secondary={formatUsd(metrics.outVolume.usd, true)}
        />
        <StatTile
          label={t.retained}
          icon={<Gauge className="size-3" aria-hidden="true" />}
          value={pct(1 - metrics.passThroughRatio, 1)}
          secondary={t.passedOn(pct(metrics.passThroughRatio, 1))}
          hint={t.retainedHint}
        />
        <StatTile
          label={t.medianDwell}
          icon={<Timer className="size-3" aria-hidden="true" />}
          value={
            metrics.medianDwellHours === null ? "—" : `${metrics.medianDwellHours.toFixed(1)} h`
          }
          secondary={t.dwellSecondary}
        />
        <StatTile
          label={t.riskProximity}
          icon={<ShieldAlert className="size-3" aria-hidden="true" />}
          value={t.riskProximityValue(metrics.riskyCounterparties)}
          secondary={t.riskProximitySecondary(pct(metrics.riskyValueShare, 1))}
          hint={t.riskProximityHint}
          // Tinted only as a supplement: the count, the share and the icon
          // already carry the signal without relying on colour.
          className={
            metrics.riskyCounterparties > 0 ? "border-destructive/45 bg-destructive/5" : undefined
          }
        />
        <StatTile
          label={t.burst}
          icon={<Activity className="size-3" aria-hidden="true" />}
          value={`${metrics.burstScore.toFixed(1)}x`}
          secondary={t.activeDays(metrics.activeDays)}
          hint={t.burstHint}
        />
      </div>

      {/* ------------------------------------------------- findings + graph */}
      <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Panel
          title={t.findingsTitle}
          description={t.findingsDescription(matched.length, context.length, clear.length)}
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
                  {t.notMatched(clear.length)}
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
            title={t.egoNetwork}
            description={t.networkDescription(network.nodes.length, network.edges.length, hop)}
            actions={
              <div className="flex flex-wrap items-center gap-1.5">
                {assets.length > 1 ? (
                  <label className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                    {t.assetLabel}
                    <select
                      value={asset}
                      onChange={(event) => setAsset(event.target.value as AssetId)}
                      className="h-9 cursor-pointer rounded border border-border bg-surface px-1.5 text-xs text-foreground"
                    >
                      {assets.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.symbol}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <Toggle
                  options={[
                    { value: "1", label: t.hop1 },
                    { value: "2", label: t.hop2 },
                  ]}
                  value={String(hop)}
                  onChange={(value) => setHop(value === "2" ? 2 : 1)}
                />
                <Toggle
                  options={[
                    { value: "both", label: t.dirBoth },
                    { value: "in", label: t.dirIn },
                    { value: "out", label: t.dirOut },
                  ]}
                  value={direction}
                  onChange={(value) => setDirection(value as typeof direction)}
                />
                <label className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                  {t.windowLabel}
                  <select
                    value={timeWindow?.days ?? ""}
                    onChange={(event) => {
                      const days = event.target.value ? Number(event.target.value) : null;
                      setTimeWindow(
                        days === null
                          ? null
                          : {
                              days,
                              from: new Date(Date.now() - days * 86_400_000).toISOString(),
                            },
                      );
                    }}
                    className="h-9 cursor-pointer rounded border border-border bg-surface px-1.5 text-xs text-foreground"
                  >
                    <option value="">{t.windowFull}</option>
                    {[30, 90, 365].map((days) => (
                      <option key={days} value={days}>
                        {t.windowDays(days)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                  {t.topK}
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
                  {showHubs ? t.hubsShown : t.hubsDamped}
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
                        {t.nothingToDraw}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-foreground-muted">
                        {/* Say which control emptied the canvas. Falling through
                            to the generic line left an analyst who had just
                            narrowed the window reading about the source slice
                            instead of the filter they set. */}
                        {assessment.dataHealth.txsUnavailable
                          ? t.nothingUpstream(meta.explorerName)
                          : timeWindow && windowDropped
                            ? t.nothingTimeWindow(timeWindow.days, windowDropped)
                            : direction !== "both"
                              ? t.nothingDirection(
                                  direction === "in" ? t.directionSending : t.directionReceiving,
                                )
                              : t.nothingEmptyWindow(assessment.dataHealth.txsAnalysed)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <RadialGraphLazy
                    nodes={network.nodes}
                    edges={network.edges}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onExpand={onExpand}
                  />
                )}
                {isLoading ? (
                  <p className="pointer-events-none absolute left-3 top-3 rounded border border-border bg-surface/90 px-2 py-1 text-[11px] text-foreground-muted">
                    {t.rerunning}
                  </p>
                ) : null}
                {selected ? (
                  <div className="absolute bottom-3 left-3 max-w-[min(20rem,calc(100%-1.5rem))] rounded-md border border-border bg-surface/95 p-2.5 text-[11px]">
                    <p className="truncate font-medium text-foreground">
                      {selected.label ?? truncateAddress(selected.address, 10, 8)}
                    </p>
                    <p className="tnum mt-0.5 text-foreground-muted">
                      {t.nodeSummary(
                        selected.ring,
                        selected.priority,
                        selected.riskScore,
                        formatCoin(selected.value, asset),
                        selected.txCount,
                      )}
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
                    {t.legendSubject}
                  </span>
                  <span>{t.legendRing1}</span>
                  <span>{t.legendRing2}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full border-2 border-dashed border-border-strong"
                      aria-hidden="true"
                    />
                    {t.legendHub}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full border-2 border-destructive"
                      aria-hidden="true"
                    />
                    {t.legendHighRisk}
                  </span>
                </div>
                {network.reduction.length ? (
                  <p className="mt-1.5 text-[11px] text-warning">
                    {t.reductionApplied(
                      network.reduction
                        .map(
                          (step) =>
                            `${dict.ui.common.reductionRules[step.rule] ?? step.rule}${
                              step.removed ? ` (−${step.removed})` : ""
                            }`,
                        )
                        .join(", "),
                    )}
                  </p>
                ) : null}
                {network.incomplete.length ? (
                  <p className="mt-1 text-[11px] text-destructive">
                    {t.expansionsFailed(network.incomplete.length)}
                  </p>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel
            flush
            title={t.counterparties}
            description={t.counterpartiesDescription}
          >
            <CounterpartyTable
              nodes={network.nodes}
              chain={chain}
              asset={asset}
              onSelect={setSelectedId}
              t={t}
            />
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
  empty,
}: {
  heading: string;
  items: string[];
  tone: "danger" | "muted" | "info";
  empty: string;
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
          <li className="text-[11px] text-foreground-muted">{empty}</li>
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
  asset,
  onSelect,
  t,
}: {
  nodes: EgoNode[];
  chain: ChainId;
  /** Values in this table follow the asset the page is analysing, not the chain's coin. */
  asset: AssetId;
  onSelect: (id: string) => void;
  t: Copy;
}) {
  const rows = nodes.filter((node) => node.ring > 0);

  const columns: Column<EgoNode>[] = [
    {
      key: "priority",
      header: t.colPriority,
      align: "right",
      cell: (node) => <span className="tnum">{node.priority}</span>,
      sortValue: (node) => node.priority,
      headerHint: t.colPriorityHint,
    },
    {
      key: "ring",
      header: t.colRing,
      align: "right",
      cell: (node) => <span className="tnum">{node.ring}</span>,
      sortValue: (node) => node.ring,
    },
    {
      key: "address",
      header: t.colCounterparty,
      cell: (node) => (
        <span className="flex items-center gap-1.5">
          <AddressLink chain={chain} address={node.address} label={node.label} />
          {node.isServiceHub ? <Badge tone="neutral">{t.badgeService}</Badge> : null}
        </span>
      ),
      sortValue: (node) => node.label ?? node.address,
    },
    {
      key: "direction",
      header: t.colDirection,
      // A counterparty that both sent and received is merged into one node with
      // direction "both", and the subject itself carries "self". Falling through
      // to the raw value printed those two as untranslated English in a table
      // whose other rows were localised.
      cell: (node) =>
        node.direction === "in" ? (
          <Badge tone="success">{t.badgeIn}</Badge>
        ) : node.direction === "out" ? (
          <Badge tone="danger">{t.badgeOut}</Badge>
        ) : (
          <Badge tone="neutral">{node.direction === "self" ? t.badgeSelf : t.badgeBoth}</Badge>
        ),
      sortValue: (node) => node.direction,
    },
    {
      key: "value",
      header: t.colValue,
      align: "right",
      cell: (node) => formatCoin(node.value, asset),
      sortValue: (node) => node.value.coin,
    },
    {
      key: "tx",
      header: t.colTxs,
      align: "right",
      cell: (node) => formatNumber(node.txCount),
      sortValue: (node) => node.txCount,
    },
    {
      key: "risk",
      header: t.colRisk,
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
      caption={t.tableCaption}
      initialSort={{ key: "priority", direction: "desc" }}
      onRowClick={(node) => onSelect(node.id)}
    />
  );
}
