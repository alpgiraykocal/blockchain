import { Network, ScanSearch, ShieldAlert, Tags } from "lucide-react";
import Link from "next/link";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { RecentLookups } from "@/components/dashboard/recent-lookups";
import { SearchBar } from "@/components/search-bar";
import { Badge, InlineLink, Panel } from "@/components/ui/primitives";
import { formatNumber } from "@/lib/format";
import { packStats } from "@/lib/tags";
import { getDictionary } from "@/lib/i18n";
import { type Locale, isLocale, localePath } from "@/lib/i18n/config";

/* Rendered per request rather than prerendered: the CSP carries a per-request
 * nonce, and Next cannot stamp one onto HTML built at compile time - a
 * prerendered page under this policy would render and never hydrate. The cost is
 * small because these pages fetch their data client-side; the expensive work
 * sits in the API routes and their caches.
 */
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const { ui } = getDictionary(locale);
  const href = (path: string) => localePath(locale, path);
  const packs = packStats();
  const totalTags = packs.reduce((sum, pack) => sum + pack.tagCount, 0);
  const abuseTags = packs.reduce((sum, pack) => sum + pack.abuseCount, 0);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-surface px-4 py-5 sm:px-6 sm:py-7">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-xl font-semibold tracking-tight text-heading sm:text-2xl">
            {ui.home.heading}
          </h1>
          <p className="mx-auto mt-1.5 max-w-xl text-sm leading-relaxed text-foreground-muted">
            {ui.home.lede}
          </p>
          <SearchBar className="mx-auto mt-4 w-full max-w-xl" primary />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] text-foreground-muted">
            <Badge tone="info">BTC · mempool.space</Badge>
            <Badge tone="info">ETH · Blockscout</Badge>
            <Badge tone="neutral">{ui.home.tagsLoaded(formatNumber(totalTags))}</Badge>
            <Badge tone="danger">{ui.home.sanctionsFlagged(formatNumber(abuseTags))}</Badge>
          </div>
        </div>
      </section>

      <DashboardClient />

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Panel
          title={ui.home.howTitle}
          description={ui.home.howDescription}
        >
          <ol className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-3">
            <StartCard
              stepLabel={ui.home.step(1)}
              href={href("/investigate")}
              icon={<ScanSearch className="size-4" aria-hidden="true" />}
              title={ui.home.steps.investigateTitle}
              body={ui.home.steps.investigateBody}
            />
            <StartCard
              stepLabel={ui.home.step(2)}
              href={href("/explorer")}
              icon={<Network className="size-4" aria-hidden="true" />}
              title={ui.home.steps.traceTitle}
              body={ui.home.steps.traceBody}
            />
            <StartCard
              stepLabel={ui.home.step(3)}
              href={href("/tags")}
              icon={<Tags className="size-4" aria-hidden="true" />}
              title={ui.home.steps.attributionTitle}
              body={ui.home.steps.attributionBody}
            />
          </ol>

          <p className="mt-3 text-[11px] text-foreground-muted">
            {ui.home.workedExampleBefore}
            <InlineLink href={href("/investigate/btc/1295rkVyNfFpqZpXvKGhDqwhP1jZcNNDMV")}>
              {ui.home.workedExampleLink}
            </InlineLink>
            .
          </p>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/35 bg-warning/8 px-3 py-2.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <p className="text-[11px] leading-relaxed text-foreground-muted">
              <span className="font-medium text-foreground">{ui.home.disclaimerLead}</span>
              {ui.home.disclaimerBody}
            </p>
          </div>
        </Panel>

        <Panel title={ui.home.recentTitle} description={ui.home.recentDescription}>
          <RecentLookups />
        </Panel>
      </div>
    </div>
  );
}

function StartCard({
  stepLabel,
  href,
  icon,
  title,
  body,
}: {
  stepLabel: string;
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="min-w-0">
      <Link
        href={href}
        className="flex h-full cursor-pointer flex-col gap-1.5 rounded-md border border-border bg-surface-2/40 p-3 transition-colors duration-200 hover:border-border-strong hover:bg-surface-2"
      >
        <span className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded bg-primary/12 text-primary">
            {icon}
          </span>
          <span className="tnum text-[11px] font-medium text-foreground-muted">
            {stepLabel}
          </span>
        </span>
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-[11px] leading-relaxed text-foreground-muted">{body}</span>
      </Link>
    </li>
  );
}
