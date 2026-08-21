import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Info,
  Layers,
  ScanSearch,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { analyzeAddress } from "@/lib/analysis";
import { getAdapter } from "@/lib/chains";
import { CHAINS, isChainId, isValidAddress } from "@/lib/chains/registry";
import {
  displayName,
  formatCoin,
  formatDate,
  formatNumber,
  formatRelative,
  formatUsd,
  truncateAddress,
} from "@/lib/format";
import { UpstreamError } from "@/lib/http";
import type { ChainId } from "@/lib/types";
import { FlowBars } from "@/components/charts/flow-bars";
import { TransactionsTable } from "@/components/transactions-table";
import { SubjectTabs } from "@/components/subject-tabs";
import { TrackVisit } from "@/components/track-visit";
import { AddressLink } from "@/components/ui/address-link";
import { RiskBadge } from "@/components/ui/risk-badge";
import { TagChip } from "@/components/ui/tag-chip";
import { StatTile } from "@/components/ui/stat-tile";
import { Badge, ErrorState, InlineLink, Panel } from "@/components/ui/primitives";

interface PageProps {
  params: Promise<{ chain: string; address: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { chain, address } = await params;
  if (!isChainId(chain)) return { title: "Unknown chain" };
  return {
    title: `${CHAINS[chain].ticker} ${truncateAddress(address, 10, 8)}`,
    description: `Balance, counterparties, cluster and risk assessment for ${CHAINS[chain].name} address ${address}.`,
  };
}

export default async function AddressPage({ params }: PageProps) {
  const { chain: chainParam, address: rawAddress } = await params;
  if (!isChainId(chainParam)) notFound();
  const chain: ChainId = chainParam;
  const decoded = decodeURIComponent(rawAddress);

  const resolved = await getAdapter(chain).resolve(decoded).catch(() => null);
  if (!resolved || !isValidAddress(chain, resolved)) {
    return (
      <Panel>
        <ErrorState
          title="Not a valid address"
          detail={`"${decoded}" is not a recognised ${CHAINS[chain].name} address.`}
        />
      </Panel>
    );
  }

  let analysis;
  try {
    analysis = await analyzeAddress(chain, resolved, 50);
  } catch (error) {
    // A 504 here is almost always an address with a history too large for the
    // explorer to page, so say that rather than leaving the analyst guessing.
    const detail =
      error instanceof UpstreamError
        ? error.status === 504
          ? `${CHAINS[chain].explorerName} did not respond in time. Addresses with very large transaction histories regularly exceed what the public API will serve; try the explorer directly.`
          : `${CHAINS[chain].explorerName} responded ${error.status}.`
        : error instanceof Error
          ? error.message
          : "Unknown error.";
    return (
      <Panel>
        <ErrorState title="Could not load this address" detail={detail} />
        <p className="pb-4 text-center text-xs">
          <InlineLink href={CHAINS[chain].explorerAddressUrl(resolved)} external>
            Open {resolved.slice(0, 12)}... on {CHAINS[chain].explorerName}
          </InlineLink>
        </p>
      </Panel>
    );
  }

  const { address, entity, transactions, neighbors, window } = analysis;
  const meta = CHAINS[chain];

  return (
    <div className="space-y-4">
      <TrackVisit chain={chain} address={address.address} />

      <SubjectTabs chain={chain} address={address.address} active="report" />

      <header className="rounded-lg border border-border bg-surface px-4 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{meta.ticker}</Badge>
              {address.isContract ? <Badge tone="accent">Contract</Badge> : null}
              <h1 className="min-w-0 text-lg font-semibold tracking-tight text-heading">
                {entity.label ? displayName(entity.label) : "Untagged address"}
              </h1>
              {/* Risk sits with the title on narrow screens; on wide ones it
                  anchors the action column on the right instead. */}
              <span className="sm:hidden">
                <RiskBadge level={address.risk.level} score={address.risk.score} size="sm" />
              </span>
            </div>
            {address.tags.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {address.tags.map((tag) => (
                  <TagChip key={tag.id} tag={tag} />
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
            <span className="hidden sm:block">
              <RiskBadge level={address.risk.level} score={address.risk.score} />
            </span>
            <div className="flex flex-wrap gap-1.5 sm:justify-end">
              <Link
                href={`/investigate/${chain}/${address.address}`}
                className="inline-flex h-9 min-h-9 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-on-primary transition-[filter] duration-200 hover:brightness-110"
              >
                <ScanSearch className="size-3.5" aria-hidden="true" />
                Open investigation
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0 xl:grid-cols-4">
        <StatTile
          label="Balance"
          icon={<Wallet className="size-3" aria-hidden="true" />}
          value={formatCoin(address.balance, chain)}
          secondary={formatUsd(address.balance.usd, true)}
        />
        <StatTile
          label="Total received"
          icon={<ArrowDownLeft className="size-3" aria-hidden="true" />}
          value={formatCoin(address.totalReceived, chain)}
          secondary={formatUsd(address.totalReceived.usd, true)}
          hint={window.totalsWindowed ? "Computed over the analysed window only" : undefined}
        />
        <StatTile
          label="Total sent"
          icon={<ArrowUpRight className="size-3" aria-hidden="true" />}
          value={formatCoin(address.totalSent, chain)}
          secondary={formatUsd(address.totalSent.usd, true)}
          hint={window.totalsWindowed ? "Computed over the analysed window only" : undefined}
        />
        <StatTile
          label="Transactions"
          icon={<Boxes className="size-3" aria-hidden="true" />}
          value={formatNumber(address.txCount)}
          secondary={
            window.txsUnavailable
              ? "counterparties unavailable"
              : `${address.inDegree} senders · ${address.outDegree} receivers`
          }
        />
      </div>

      {window.txsUnavailable ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-warning/45 bg-warning/10 px-3 py-2.5"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0 text-[11px] leading-relaxed text-foreground-muted">
            <p className="font-medium text-foreground">Transaction list unavailable</p>
            <p className="mt-0.5">
              {meta.explorerName} could not serve this address&apos;s transactions
              ({window.txsUnavailable}). Balance, lifetime totals and attribution above are
              complete; counterparties, clustering and degree counts are not available for
              this load. Reload to retry, or open the address on {meta.explorerName}.
            </p>
          </div>
        </div>
      ) : (
        <WindowNotice
          analysed={window.txsAnalysed}
          total={window.txsTotal}
          totalsWindowed={window.totalsWindowed}
          clusterPartial={window.clusterPartial}
          explorer={meta.explorerName}
        />
      )}

      <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-3">
        <Panel
          title="Risk summary"
          description={`${address.risk.signals.length} signal${
            address.risk.signals.length === 1 ? "" : "s"
          } · exposure depth ${address.risk.hops} hop${address.risk.hops === 1 ? "" : "s"}`}
        >
          {/* The headline signal only. Reading the evidence, the arguments
              against it and what to do next is the investigation's job; listing
              it twice invites the two pages to drift apart. */}
          <div className="rounded border border-border bg-surface-2/50 px-2.5 py-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                {address.risk.signals[0]?.label ?? "No signal"}
              </span>
              {address.risk.signals[0]?.weight ? (
                <span className="tnum shrink-0 text-[11px] text-foreground-muted">
                  +{address.risk.signals[0].weight}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-foreground-muted">
              {address.risk.signals[0]?.detail ??
                "No tag matched and no structural heuristic fired in the analysed window."}
            </p>
          </div>

          {address.risk.signals.length > 1 ? (
            <p className="mt-2 text-[11px] text-foreground-muted">
              {address.risk.signals.length - 1} further signal
              {address.risk.signals.length === 2 ? "" : "s"} contributed to this score.
            </p>
          ) : null}

          <p className="mt-3 text-[11px] leading-relaxed text-foreground-muted">
            <InlineLink href={`/investigate/${chain}/${address.address}`}>
              Open the investigation
            </InlineLink>{" "}
            for the typology findings behind this score, the arguments against each one,
            and a recommended disposition.
          </p>
        </Panel>

        <Panel
          title="Entity / cluster"
          description={clusterDescription(entity.method)}
          actions={
            <Badge tone={entity.addressCount > 1 ? "accent" : "neutral"}>
              {formatNumber(entity.addressCount)} address
              {entity.addressCount === 1 ? "" : "es"}
            </Badge>
          }
        >
          <dl className="grid grid-cols-2 gap-x-4 text-sm">
            <div className="py-1">
              <dt className="text-[11px] uppercase tracking-wide text-foreground-muted">
                Entity id
              </dt>
              <dd className="truncate font-mono text-xs" title={entity.entityId}>
                {truncateAddress(entity.entityId, 12, 8)}
              </dd>
            </div>
            <div className="py-1">
              <dt className="text-[11px] uppercase tracking-wide text-foreground-muted">
                First / last seen
              </dt>
              <dd className="text-xs" title={`${formatDate(address.firstSeen)} – ${formatDate(address.lastSeen)}`}>
                {formatRelative(address.firstSeen)} → {formatRelative(address.lastSeen)}
              </dd>
            </div>
          </dl>

          {entity.addresses.length > 1 ? (
            <>
              <p className="mt-3 mb-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                Co-spending members
              </p>
              <ul className="max-h-44 space-y-1 overflow-y-auto pr-1">
                {entity.addresses.map((member) => (
                  <li key={member} className="flex items-center gap-1.5">
                    <Layers className="size-3 shrink-0 text-foreground-muted" aria-hidden="true" />
                    <AddressLink chain={chain} address={member} truncate head={14} tail={10} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-foreground-muted">
              {entity.method === "account-identity"
                ? "Account-model chains expose no co-spend signal, so one address is treated as one entity until an analyst merges them."
                : "No co-spending partner appeared in the analysed window, so this address stands alone as its own entity."}
            </p>
          )}
        </Panel>

        <Panel
          title="Counterparty concentration"
          description="Top flows by value in the analysed window"
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                <ArrowDownLeft className="size-3 text-success" aria-hidden="true" />
                Inbound
              </p>
              <FlowBars rows={neighbors} chain={chain} direction="in" limit={5} />
            </div>
            <div>
              <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                <ArrowUpRight className="size-3 text-secondary" aria-hidden="true" />
                Outbound
              </p>
              <FlowBars rows={neighbors} chain={chain} direction="out" limit={5} />
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        flush
        title="Transactions"
        description={`${transactions.length} transaction${
          transactions.length === 1 ? "" : "s"
        } in the analysed window`}
      >
        <TransactionsTable transactions={transactions} chain={chain} />
      </Panel>
    </div>
  );
}

function clusterDescription(method: string) {
  if (method === "multi-input") {
    return "Derived with the multi-input (co-spend) heuristic over the analysed window.";
  }
  if (method === "account-identity") return "Account model — one address, one entity.";
  return "No clustering rule produced a merge for this address.";
}

function WindowNotice({
  analysed,
  total,
  totalsWindowed,
  clusterPartial,
  explorer,
}: {
  analysed: number;
  total: number;
  totalsWindowed: boolean;
  clusterPartial: boolean;
  explorer: string;
}) {
  const partial = analysed < total;
  if (!partial && !totalsWindowed && !clusterPartial) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-info/35 bg-info/8 px-3 py-2.5">
      <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
      <div className="min-w-0 text-[11px] leading-relaxed text-foreground-muted">
        <p className="font-medium text-foreground">Bounded analysis window</p>
        <p className="mt-0.5">
          {analysed} of {formatNumber(total)} transactions were pulled from {explorer}.
          {totalsWindowed
            ? " Received and sent totals are computed over that window, not the full history."
            : " Balance and lifetime totals come from the explorer and cover the full history."}
          {clusterPartial
            ? " Clustering only sees co-spends inside the window, so the entity may be larger on the full chain."
            : ""}
        </p>
      </div>
    </div>
  );
}
