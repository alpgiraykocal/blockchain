import type { Metadata } from "next";
import { AlertTriangle, Database, ExternalLink, RefreshCw, ShieldAlert } from "lucide-react";
import { UserTagsPanel } from "./tags-client";
import { OfacPanel, type OfacRow } from "./ofac-panel";
import { LabelFeedsPanel } from "./label-feeds";
import { Badge, InlineLink, Panel } from "@/components/ui/primitives";
import {
  OFAC_SNAPSHOT,
  isSnapshotStale,
  ofacTagCount,
  packStats,
  programBreakdown,
  snapshotAgeDays,
  snapshotIssuedAt,
} from "@/lib/tags";
import { formatDate, formatNumber } from "@/lib/format";
import type { ChainId } from "@/lib/types";
import { getDictionary } from "@/lib/i18n";
import { type Locale, isLocale } from "@/lib/i18n/config";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const { ui } = getDictionary(isLocale(locale) ? locale : "en");
  return { title: ui.tags.metaTitle, description: ui.tags.metaDescription };
}

const RISK_BANDS = [
  { range: "0–14", level: "levelClear", detail: "bandClear" },
  { range: "15–39", level: "levelLow", detail: "bandLow" },
  { range: "40–69", level: "levelMedium", detail: "bandMedium" },
  { range: "70–89", level: "levelHigh", detail: "bandHigh" },
  { range: "90–100", level: "levelSevere", detail: "bandSevere" },
] as const;

/* Rendered per request rather than prerendered: the CSP carries a per-request
 * nonce, and Next cannot stamp one onto HTML built at compile time - a
 * prerendered page under this policy would render and never hydrate. The cost is
 * small because these pages fetch their data client-side; the expensive work
 * sits in the API routes and their caches.
 */
export const dynamic = "force-dynamic";

export default async function TagsPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const ui = getDictionary(locale).ui;
  const t = ui.tags;
  const packs = packStats(ui.packs);
  const totalTags = packs.reduce((sum, pack) => sum + pack.tagCount, 0);
  const stale = isSnapshotStale();
  const issued = snapshotIssuedAt();

  const ofacRows: OfacRow[] = OFAC_SNAPSHOT.entries
    .filter((entry): entry is typeof entry & { chain: ChainId } =>
      entry.chain === "btc" || entry.chain === "eth",
    )
    .map((entry) => ({
      address: entry.address,
      chain: entry.chain,
      currency: entry.currency,
      name: entry.name,
      partyType: entry.partyType,
      list: entry.list,
      programs: entry.programs,
      designatedAt: entry.designatedAt,
    }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-heading">{t.heading}</h1>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-foreground-muted">
          {t.lede}
        </p>
      </div>

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-2">
        <Panel title={t.packsTitle} description={t.packsDescription(formatNumber(totalTags), packs.length)}>
          <ul className="space-y-2.5">
            {packs.map((pack) => (
              <li key={pack.id} className="rounded border border-border bg-surface-2/40 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{pack.title}</p>
                    <p className="text-[11px] text-foreground-muted">
                      {pack.creator.startsWith("©") ? pack.creator : t.by(pack.creator)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {pack.generated ? (
                      <Badge tone="info" icon={<RefreshCw className="size-3" aria-hidden="true" />}>
                        {t.autoSynced}
                      </Badge>
                    ) : null}
                    {pack.stale ? (
                      <Badge tone="warning" icon={<AlertTriangle className="size-3" aria-hidden="true" />}>
                        {t.daysOld(pack.ageDays!)}
                      </Badge>
                    ) : null}
                    <Badge tone="neutral">{t.tagCount(formatNumber(pack.tagCount))}</Badge>
                    {pack.abuseCount ? (
                      <Badge tone="danger">{t.abuseCount(formatNumber(pack.abuseCount))}</Badge>
                    ) : null}
                    {pack.chains.map((chain) => (
                      <Badge key={chain} tone="info">
                        {chain.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-foreground-muted">
                  {pack.description}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground-muted">
                  <span>{t.lastModified(formatDate(pack.lastmod, false, locale))}</span>
                  {pack.homepage ? (
                    <InlineLink href={pack.homepage} external>
                      <span className="inline-flex items-center gap-1">
                        {t.source}
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </span>
                    </InlineLink>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title={t.scoreTitle}
          description={t.scoreDescription}
        >
          <ol className="space-y-2 text-xs leading-relaxed text-foreground-muted">
            <li>
              <span className="font-medium text-foreground">{t.step1Lead}</span>
              {t.step1Body}
            </li>
            <li>
              <span className="font-medium text-foreground">{t.step2Lead}</span>
              {t.step2Body}
            </li>
            <li>
              <span className="font-medium text-foreground">{t.step3Lead}</span>
              {t.step3Body}
            </li>
            <li>
              <span className="font-medium text-foreground">{t.step4Lead}</span>
              {t.step4Body}
            </li>
          </ol>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <caption className="sr-only">{t.bandsCaption}</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-1.5 pr-3 font-semibold text-foreground-muted">
                    {t.colScore}
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-semibold text-foreground-muted">
                    {t.colLevel}
                  </th>
                  <th scope="col" className="py-1.5 font-semibold text-foreground-muted">
                    {t.colMeaning}
                  </th>
                </tr>
              </thead>
              <tbody>
                {RISK_BANDS.map((band) => (
                  <tr key={band.range} className="border-b border-border/70 last:border-b-0">
                    <td className="tnum py-1.5 pr-3">{band.range}</td>
                    <td className="py-1.5 pr-3 font-medium text-foreground">{t[band.level]}</td>
                    <td className="py-1.5 text-foreground-muted">{t[band.detail]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {stale ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-warning/45 bg-warning/10 px-3 py-2.5"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0 text-[11px] leading-relaxed text-foreground-muted">
            <p className="font-medium text-foreground">
              {t.staleTitle(snapshotAgeDays()!)}
            </p>
            <p className="mt-0.5">
              {t.staleBodyBefore}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">npm run sync:ofac</code>
              {t.staleBodyAfter}
            </p>
          </div>
        </div>
      ) : null}

      <Panel
        title={t.ofacTitle}
        description={t.ofacDescription}
        actions={
          <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
            <ShieldAlert className="size-3.5" aria-hidden="true" />
            {t.screenable(formatNumber(ofacTagCount()))}
          </span>
        }
      >
        <div className="grid gap-3 [&>*]:min-w-0 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          <div className="space-y-2.5">
            <dl className="space-y-1.5 rounded border border-border bg-surface-2/40 p-3 text-[11px]">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-foreground-muted">{t.fieldSource}</dt>
                <dd className="text-right font-medium text-foreground">{OFAC_SNAPSHOT.source}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-foreground-muted">{t.fieldIssued}</dt>
                <dd className="tnum text-right font-medium text-foreground">
                  {formatDate(issued, false, locale)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-foreground-muted">{t.fieldRetrieved}</dt>
                <dd className="tnum text-right font-medium text-foreground">
                  {formatDate(OFAC_SNAPSHOT.retrievedAt, true, locale)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-foreground-muted">{t.fieldAddresses}</dt>
                <dd className="tnum text-right font-medium text-foreground">
                  {formatNumber(OFAC_SNAPSHOT.counts.total)}
                </dd>
              </div>
              {OFAC_SNAPSHOT.files.map((file) => (
                <div key={file.name} className="border-t border-border pt-1.5">
                  <p className="font-mono text-[10px] text-foreground">{file.name}</p>
                  <p className="tnum text-foreground-muted">
                    {t.fileLine((file.bytes / 1e6).toFixed(1), formatNumber(file.addresses))}
                  </p>
                  <p
                    className="truncate font-mono text-[10px] text-foreground-muted"
                    title={`sha256:${file.sha256}`}
                  >
                    sha256 {file.sha256.slice(0, 24)}…
                  </p>
                </div>
              ))}
            </dl>

            <div className="rounded border border-border bg-surface-2/40 p-3">
              <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                <Database className="size-3" aria-hidden="true" />
                {t.byCurrency}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {Object.entries(OFAC_SNAPSHOT.counts.byCurrency)
                  .sort((a, b) => b[1] - a[1])
                  .map(([currency, count]) => (
                    <li key={currency}>
                      <Badge
                        tone={
                          currency === "XBT" || currency === "ETH" ? "info" : "neutral"
                        }
                        title={
                          currency === "XBT" || currency === "ETH"
                            ? t.currencyScreened
                            : t.currencyStored
                        }
                      >
                        {currency} {count}
                      </Badge>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="rounded border border-border bg-surface-2/40 p-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                {t.topProgrammes}
              </p>
              <ul className="space-y-1">
                {programBreakdown(6).map((entry) => (
                  <li
                    key={entry.program}
                    className="flex items-baseline justify-between gap-2 text-[11px]"
                  >
                    <span className="truncate font-mono text-foreground">{entry.program}</span>
                    <span className="tnum shrink-0 text-foreground-muted">{entry.count}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] leading-relaxed text-foreground-muted">
              {t.hitNote}
            </p>
          </div>

          <OfacPanel rows={ofacRows} />
        </div>
      </Panel>

      <LabelFeedsPanel locale={locale} />

      <UserTagsPanel />
    </div>
  );
}
