import { ExternalLink, Scale, ShieldQuestion } from "lucide-react";
import { Badge, InlineLink, Panel } from "@/components/ui/primitives";
import { formatDate, formatNumber } from "@/lib/format";
import { actorLeaderboard, labelSnapshot, labelSnapshotError } from "@/lib/tags";
import { getDictionary } from "@/lib/i18n";
import { type Locale, isLocale } from "@/lib/i18n/config";

const CATEGORY_TONE: Record<string, "success" | "info" | "accent" | "danger" | "neutral"> = {
  exchange: "success",
  "mining-pool": "accent",
  defi: "info",
  bridge: "info",
  mixer: "danger",
  gambling: "neutral",
  "wallet-service": "neutral",
  merchant: "neutral",
  unknown: "neutral",
};

/** A server component: it reads the label snapshot off disk, so the copy is
 *  looked up here rather than through the client context. */
export function LabelFeedsPanel({ locale: raw }: { locale: string }) {
  const locale: Locale = isLocale(raw) ? raw : "en";
  const t = getDictionary(locale).ui.tags;
  const snapshot = labelSnapshot();
  const error = labelSnapshotError();
  const leaders = actorLeaderboard(14);

  if (error) {
    return (
      <Panel title={t.feedsTitle} description={t.feedsDescription}>
        <div role="alert" className="rounded border border-warning/45 bg-warning/10 px-3 py-2.5">
          <p className="text-xs font-medium text-foreground">{t.feedsNoSnapshot}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-foreground-muted">
            {error}
            {t.feedsNoSnapshotBefore}
            <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">npm run sync:labels</code>
            {t.feedsNoSnapshotAfter}
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title={t.feedsTitle}
      description={t.feedsPanelDescription}
      actions={
        <div className="flex items-center gap-1.5">
          <Badge tone="neutral">{t.feedsProfile(snapshot.profile)}</Badge>
          <Badge tone="info">{t.feedsAddresses(formatNumber(snapshot.counts.total))}</Badge>
        </div>
      }
    >
      <div className="grid gap-3 [&>*]:min-w-0 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-2.5">
          <ul className="space-y-2">
            {snapshot.sources.map((source) => (
              <li key={source.id} className="rounded border border-border bg-surface-2/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-xs font-medium text-foreground">{source.title}</p>
                  <Badge tone="success" icon={<Scale className="size-3" aria-hidden="true" />}>
                    {source.licence}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-foreground-muted">
                  {source.attribution}
                </p>
                <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-foreground-muted">
                  <div className="flex gap-1">
                    <dt>{t.feedsAddressesLabel}</dt>
                    <dd className="tnum font-medium text-foreground">
                      {formatNumber(source.addresses)}
                    </dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>{t.feedsRevision}</dt>
                    <dd className="font-mono text-foreground">{source.version ?? t.feedsUnknown}</dd>
                  </div>
                </dl>
                <InlineLink href={source.homepage} external className="mt-1 inline-block text-[11px]">
                  <span className="inline-flex items-center gap-1">
                    {source.homepage.replace("https://github.com/", "")}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </span>
                </InlineLink>
              </li>
            ))}
          </ul>

          <div className="rounded border border-border bg-surface-2/40 p-3">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              {t.feedsCoverage}
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {Object.entries(snapshot.counts.byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => (
                  <li key={category}>
                    <Badge tone={CATEGORY_TONE[category] ?? "neutral"}>
                      {category} {formatNumber(count)}
                    </Badge>
                  </li>
                ))}
            </ul>
            <p className="mt-2 text-[11px] text-foreground-muted">
              {t.feedsTotals(
                Object.entries(snapshot.counts.byChain)
                  .map(([chain, count]) => `${chain.toUpperCase()} ${formatNumber(count)}`)
                  .join(" · "),
                formatNumber(snapshot.labels.length),
                formatNumber(snapshot.actors.length),
                formatDate(snapshot.generatedAt, false, locale),
              )}
            </p>
          </div>

          {snapshot.excluded.map((source) => (
            <div
              key={source.id}
              className="flex items-start gap-2 rounded border border-warning/40 bg-warning/8 p-3"
            >
              <ShieldQuestion className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-foreground">
                  {t.feedsExcluded(source.title)}{" "}
                  <span className="font-normal text-foreground-muted">
                    {t.feedsLicence(source.licence)}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-foreground-muted">
                  {source.reason}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
            {t.feedsTopActors}
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {leaders.map((entry) => (
              <li
                key={entry.actor?.id ?? entry.label}
                className="flex min-w-0 items-center justify-between gap-2 rounded border border-border bg-surface-2/40 px-2.5 py-2"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium text-foreground">
                    {entry.label}
                  </span>
                  <span className="text-[11px] text-foreground-muted">{entry.category}</span>
                </div>
                <span className="tnum shrink-0 text-[11px] text-foreground-muted">
                  {formatNumber(entry.addresses, true)}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[11px] leading-relaxed text-foreground-muted">
            {t.feedsNote}
          </p>
        </div>
      </div>
    </Panel>
  );
}
