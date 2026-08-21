import { Network, ShieldAlert, Tags, Waypoints } from "lucide-react";
import Link from "next/link";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { RecentLookups } from "@/components/dashboard/recent-lookups";
import { SearchBar } from "@/components/search-bar";
import { Badge, Panel } from "@/components/ui/primitives";
import { formatNumber } from "@/lib/format";
import { packStats } from "@/lib/tags";

export default function DashboardPage() {
  const packs = packStats();
  const totalTags = packs.reduce((sum, pack) => sum + pack.tagCount, 0);
  const abuseTags = packs.reduce((sum, pack) => sum + pack.abuseCount, 0);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-surface px-4 py-5 sm:px-6 sm:py-7">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-xl font-semibold tracking-tight text-heading sm:text-2xl">
            Cryptoasset graph analytics
          </h1>
          <p className="mx-auto mt-1.5 max-w-xl text-sm leading-relaxed text-foreground-muted">
            Look up any Bitcoin or Ethereum address to see its balance, counterparties,
            co-spending cluster and attribution-driven risk — then walk the transaction
            flow hop by hop in the graph explorer.
          </p>
          <SearchBar className="mx-auto mt-4 w-full max-w-xl" />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] text-foreground-muted">
            <Badge tone="info">BTC · mempool.space</Badge>
            <Badge tone="info">ETH · Blockscout</Badge>
            <Badge tone="neutral">{formatNumber(totalTags)} attribution tags loaded</Badge>
            <Badge tone="danger">{formatNumber(abuseTags)} sanctions-flagged</Badge>
          </div>
        </div>
      </section>

      <DashboardClient />

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Panel
          title="Where to start"
          description="Three entry points into an investigation"
        >
          <div className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-3">
            <StartCard
              href="/explorer"
              icon={<Network className="size-4" aria-hidden="true" />}
              title="Graph explorer"
              body="Seed a node, expand senders and receivers one hop at a time, and highlight the shortest path between two addresses."
            />
            <StartCard
              href="/tags"
              icon={<Tags className="size-4" aria-hidden="true" />}
              title="Tags & risk"
              body="Browse the loaded TagPacks, see which addresses carry sanctions or abuse categories, and read how the risk score is built."
            />
            <StartCard
              href="/address/btc/bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97"
              icon={<Waypoints className="size-4" aria-hidden="true" />}
              title="Sample report"
              body="Open a tagged exchange hot wallet to see a full address report: cluster members, flow concentration and transaction history."
            />
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/35 bg-warning/8 px-3 py-2.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <p className="text-[11px] leading-relaxed text-foreground-muted">
              <span className="font-medium text-foreground">Read the score, not the verdict.</span>{" "}
              Clustering and risk are heuristics computed over a bounded transaction
              window from public explorers. Treat every result as a lead to verify, not
              as a compliance determination.
            </p>
          </div>
        </Panel>

        <Panel title="Recent lookups" description="Stored in this browser only">
          <RecentLookups />
        </Panel>
      </div>
    </div>
  );
}

function StartCard({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group flex cursor-pointer flex-col gap-1.5 rounded-md border border-border bg-surface-2/40 p-3 transition-colors duration-200 hover:border-border-strong hover:bg-surface-2"
    >
      <span className="inline-flex size-8 items-center justify-center rounded bg-primary/12 text-primary">
        {icon}
      </span>
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="text-[11px] leading-relaxed text-foreground-muted">{body}</span>
    </Link>
  );
}
