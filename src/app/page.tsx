import { Network, ScanSearch, ShieldAlert, Tags } from "lucide-react";
import Link from "next/link";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { RecentLookups } from "@/components/dashboard/recent-lookups";
import { SearchBar } from "@/components/search-bar";
import { Badge, InlineLink, Panel } from "@/components/ui/primitives";
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
          <SearchBar className="mx-auto mt-4 w-full max-w-xl" primary />
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
          title="How a review runs"
          description="Search an address, then work it through the three lenses"
        >
          <ol className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-3">
            <StartCard
              step={1}
              href="/investigate"
              icon={<ScanSearch className="size-4" aria-hidden="true" />}
              title="Investigate"
              body="Run the assessment: typology findings with their counter-arguments, a triage disposition, and a draft case file with an audit trail."
            />
            <StartCard
              step={2}
              href="/explorer"
              icon={<Network className="size-4" aria-hidden="true" />}
              title="Trace the flow"
              body="Expand senders and receivers hop by hop, and highlight the shortest path between two addresses."
            />
            <StartCard
              step={3}
              href="/tags"
              icon={<Tags className="size-4" aria-hidden="true" />}
              title="Check attribution"
              body="See which sanctions and actor feeds produced a label, how current they are, and add your own tags."
            />
          </ol>

          <p className="mt-3 text-[11px] text-foreground-muted">
            Every address opens on its report; the investigation and the graph are one
            click away on the same subject bar. Worked example:{" "}
            <InlineLink href="/investigate/btc/1295rkVyNfFpqZpXvKGhDqwhP1jZcNNDMV">
              a designated exchange
            </InlineLink>
            .
          </p>

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
  step,
  href,
  icon,
  title,
  body,
}: {
  step: number;
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
            Step {step}
          </span>
        </span>
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-[11px] leading-relaxed text-foreground-muted">{body}</span>
      </Link>
    </li>
  );
}
