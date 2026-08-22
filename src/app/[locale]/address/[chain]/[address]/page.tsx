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
import { getDictionary } from "@/lib/i18n";
import { type Locale, isLocale, localePath } from "@/lib/i18n/config";

interface PageProps {
  params: Promise<{ locale: string; chain: string; address: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, chain, address } = await params;
  const { ui } = getDictionary(isLocale(rawLocale) ? rawLocale : "en");
  if (!isChainId(chain)) return { title: ui.address.unknownChain };
  return {
    title: `${CHAINS[chain].ticker} ${truncateAddress(address, 10, 8)}`,
    description: ui.address.metaDescription(CHAINS[chain].name, address),
  };
}

export default async function AddressPage({ params }: PageProps) {
  const { locale: rawLocale, chain: chainParam, address: rawAddress } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const t = getDictionary(locale).ui.address;
  const href = (path: string) => localePath(locale, path);
  if (!isChainId(chainParam)) notFound();
  const chain: ChainId = chainParam;
  const decoded = decodeURIComponent(rawAddress);

  const resolved = await getAdapter(chain).resolve(decoded).catch(() => null);
  if (!resolved || !isValidAddress(chain, resolved)) {
    return (
      <Panel>
        <ErrorState
          title={t.notValidTitle}
          detail={t.notValidDetail(decoded, CHAINS[chain].name)}
        />
      </Panel>
    );
  }

  let analysis;
  try {
    analysis = await analyzeAddress(chain, resolved, 50, getDictionary(locale).aml);
  } catch (error) {
    // A 504 here is almost always an address with a history too large for the
    // explorer to page, so say that rather than leaving the analyst guessing.
    const detail =
      error instanceof UpstreamError
        ? error.status === 504
          ? t.timeout(CHAINS[chain].explorerName)
          : t.upstreamStatus(CHAINS[chain].explorerName, error.status)
        : error instanceof Error
          ? error.message
          : t.unknownError;
    return (
      <Panel>
        <ErrorState title={t.loadFailedTitle} detail={detail} />
        <p className="pb-4 text-center text-xs">
          <InlineLink href={CHAINS[chain].explorerAddressUrl(resolved)} external>
            {t.openOnExplorer(resolved.slice(0, 12), CHAINS[chain].explorerName)}
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
              {address.isContract ? <Badge tone="accent">{t.contract}</Badge> : null}
              <h1 className="min-w-0 text-lg font-semibold tracking-tight text-heading">
                {entity.label ? displayName(entity.label) : t.untagged}
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
                href={href(`/investigate/${chain}/${address.address}`)}
                className="inline-flex h-9 min-h-9 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-on-primary transition-[filter] duration-200 hover:brightness-110"
              >
                <ScanSearch className="size-3.5" aria-hidden="true" />
                {t.openInvestigation}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0 xl:grid-cols-4">
        <StatTile
          label={t.balance}
          icon={<Wallet className="size-3" aria-hidden="true" />}
          value={formatCoin(address.balance, chain)}
          secondary={formatUsd(address.balance.usd, true)}
        />
        <StatTile
          label={t.totalReceived}
          icon={<ArrowDownLeft className="size-3" aria-hidden="true" />}
          value={formatCoin(address.totalReceived, chain)}
          secondary={formatUsd(address.totalReceived.usd, true)}
          hint={window.totalsWindowed ? t.windowOnly : undefined}
        />
        <StatTile
          label={t.totalSent}
          icon={<ArrowUpRight className="size-3" aria-hidden="true" />}
          value={formatCoin(address.totalSent, chain)}
          secondary={formatUsd(address.totalSent.usd, true)}
          hint={window.totalsWindowed ? t.windowOnly : undefined}
        />
        <StatTile
          label={t.transactions}
          icon={<Boxes className="size-3" aria-hidden="true" />}
          value={formatNumber(address.txCount)}
          secondary={
            window.txsUnavailable
              ? t.countersUnavailable
              : t.degrees(address.inDegree, address.outDegree)
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
            <p className="font-medium text-foreground">{t.txListUnavailableTitle}</p>
            <p className="mt-0.5">
              {t.txListUnavailableBody(meta.explorerName, window.txsUnavailable)}
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
          t={t}
        />
      )}

      <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-3">
        <Panel
          title={t.riskSummary}
          description={t.riskSummaryDescription(address.risk.signals.length, address.risk.hops)}
        >
          {/* The headline signal only. Reading the evidence, the arguments
              against it and what to do next is the investigation's job; listing
              it twice invites the two pages to drift apart. */}
          <div className="rounded border border-border bg-surface-2/50 px-2.5 py-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                {address.risk.signals[0]?.label ?? t.noSignal}
              </span>
              {address.risk.signals[0]?.weight ? (
                <span className="tnum shrink-0 text-[11px] text-foreground-muted">
                  +{address.risk.signals[0].weight}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-foreground-muted">
              {address.risk.signals[0]?.detail ?? t.noSignalDetail}
            </p>
          </div>

          {address.risk.signals.length > 1 ? (
            <p className="mt-2 text-[11px] text-foreground-muted">
              {t.furtherSignals(address.risk.signals.length - 1)}
            </p>
          ) : null}

          <p className="mt-3 text-[11px] leading-relaxed text-foreground-muted">
            <InlineLink href={href(`/investigate/${chain}/${address.address}`)}>
              {t.investigationLink}
            </InlineLink>
            {t.investigationLinkAfter}
          </p>
        </Panel>

        <Panel
          title={t.entityTitle}
          description={clusterDescription(entity.method, t)}
          actions={
            <Badge tone={entity.addressCount > 1 ? "accent" : "neutral"}>
              {t.addressCount(formatNumber(entity.addressCount), entity.addressCount)}
            </Badge>
          }
        >
          <dl className="grid grid-cols-2 gap-x-4 text-sm">
            <div className="py-1">
              <dt className="text-[11px] uppercase tracking-wide text-foreground-muted">
                {t.entityId}
              </dt>
              <dd className="truncate font-mono text-xs" title={entity.entityId}>
                {truncateAddress(entity.entityId, 12, 8)}
              </dd>
            </div>
            <div className="py-1">
              <dt className="text-[11px] uppercase tracking-wide text-foreground-muted">
                {t.firstLastSeen}
              </dt>
              <dd className="text-xs" title={`${formatDate(address.firstSeen, true, locale)} – ${formatDate(address.lastSeen, true, locale)}`}>
                {formatRelative(address.firstSeen, locale)} → {formatRelative(address.lastSeen, locale)}
              </dd>
            </div>
          </dl>

          {entity.addresses.length > 1 ? (
            <>
              <p className="mt-3 mb-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                {t.coSpendingMembers}
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
              {entity.method === "account-identity" ? t.accountIdentityNote : t.noCoSpendNote}
            </p>
          )}
        </Panel>

        <Panel
          title={t.concentrationTitle}
          description={t.concentrationDescription}
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                <ArrowDownLeft className="size-3 text-success" aria-hidden="true" />
                {t.inbound}
              </p>
              <FlowBars rows={neighbors} chain={chain} direction="in" limit={5} />
            </div>
            <div>
              <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                <ArrowUpRight className="size-3 text-secondary" aria-hidden="true" />
                {t.outbound}
              </p>
              <FlowBars rows={neighbors} chain={chain} direction="out" limit={5} />
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        flush
        title={t.transactions}
        description={t.txPanelDescription(transactions.length)}
      >
        <TransactionsTable transactions={transactions} chain={chain} />
      </Panel>
    </div>
  );
}

type AddressCopy = ReturnType<typeof getDictionary>["ui"]["address"];

function clusterDescription(method: string, t: AddressCopy) {
  if (method === "multi-input") return t.clusterMultiInput;
  if (method === "account-identity") return t.clusterAccount;
  return t.clusterNone;
}

function WindowNotice({
  analysed,
  total,
  totalsWindowed,
  clusterPartial,
  explorer,
  t,
}: {
  analysed: number;
  total: number;
  totalsWindowed: boolean;
  clusterPartial: boolean;
  explorer: string;
  t: AddressCopy;
}) {
  const partial = analysed < total;
  if (!partial && !totalsWindowed && !clusterPartial) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-info/35 bg-info/8 px-3 py-2.5">
      <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
      <div className="min-w-0 text-[11px] leading-relaxed text-foreground-muted">
        <p className="font-medium text-foreground">{t.windowTitle}</p>
        <p className="mt-0.5">
          {t.windowPulled(analysed, formatNumber(total), explorer)}
          {totalsWindowed ? t.windowTotalsWindowed : t.windowTotalsFull}
          {clusterPartial ? t.windowClusterPartial : ""}
        </p>
      </div>
    </div>
  );
}
