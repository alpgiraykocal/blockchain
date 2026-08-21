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

export const metadata: Metadata = {
  title: "Tags & risk",
  description:
    "Browse the loaded attribution TagPacks, manage your own local tags, and read how the risk score is derived.",
};

const RISK_BANDS = [
  { range: "0–14", level: "Clear", detail: "No attribution matched and no structural heuristic fired." },
  { range: "15–39", level: "Low", detail: "Weak or distant signal — worth noting, not acting on." },
  { range: "40–69", level: "Medium", detail: "Structural pattern or a decayed multi-hop exposure." },
  { range: "70–89", level: "High", detail: "Strong direct attribution or close exposure to an abuse category." },
  { range: "90–100", level: "Severe", detail: "Sanctions match or equivalent — a hard stop, not a score." },
];

export default function TagsPage() {
  const packs = packStats();
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
        <h1 className="text-lg font-semibold tracking-tight text-heading">Tags & risk</h1>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-foreground-muted">
          Attribution is what turns an anonymous address into an actor. Blockchain Analysis ships
          with public TagPacks and lets you layer your own tags on top — both feed the
          same risk model.
        </p>
      </div>

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-2">
        <Panel title="Loaded TagPacks" description={`${formatNumber(totalTags)} tags across ${packs.length} packs`}>
          <ul className="space-y-2.5">
            {packs.map((pack) => (
              <li key={pack.id} className="rounded border border-border bg-surface-2/40 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{pack.title}</p>
                    <p className="text-[11px] text-foreground-muted">
                      {pack.creator.startsWith("©") ? pack.creator : `by ${pack.creator}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {pack.generated ? (
                      <Badge tone="info" icon={<RefreshCw className="size-3" aria-hidden="true" />}>
                        auto-synced
                      </Badge>
                    ) : null}
                    {pack.stale ? (
                      <Badge tone="warning" icon={<AlertTriangle className="size-3" aria-hidden="true" />}>
                        {pack.ageDays}d old
                      </Badge>
                    ) : null}
                    <Badge tone="neutral">{formatNumber(pack.tagCount)} tags</Badge>
                    {pack.abuseCount ? (
                      <Badge tone="danger">{formatNumber(pack.abuseCount)} abuse</Badge>
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
                  <span>Last modified {formatDate(pack.lastmod, false)}</span>
                  {pack.homepage ? (
                    <InlineLink href={pack.homepage} external>
                      <span className="inline-flex items-center gap-1">
                        source
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
          title="How the risk score works"
          description="Deterministic, explainable, and always shown with its signals"
        >
          <ol className="space-y-2 text-xs leading-relaxed text-foreground-muted">
            <li>
              <span className="font-medium text-foreground">1. Direct attribution.</span> A tag
              on the address itself contributes its abuse weight scaled by the tag&apos;s
              confidence. Sanctions saturate the score at 100.
            </li>
            <li>
              <span className="font-medium text-foreground">2. Exposure by hop.</span> A tagged
              counterparty contributes the same weight decayed by 0.55 per hop, then scaled
              by that counterparty&apos;s share of the observed flow.
            </li>
            <li>
              <span className="font-medium text-foreground">3. Structural heuristics.</span>{" "}
              Fan-in, fan-out and non-repeating-counterparty patterns lift a clean address
              into the medium band — they never push it into high on their own.
            </li>
            <li>
              <span className="font-medium text-foreground">4. The maximum wins.</span> Signals
              do not stack into a sum, so one strong finding cannot be diluted by many weak ones.
            </li>
          </ol>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <caption className="sr-only">Risk score bands</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-1.5 pr-3 font-semibold text-foreground-muted">
                    Score
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-semibold text-foreground-muted">
                    Level
                  </th>
                  <th scope="col" className="py-1.5 font-semibold text-foreground-muted">
                    Meaning
                  </th>
                </tr>
              </thead>
              <tbody>
                {RISK_BANDS.map((band) => (
                  <tr key={band.range} className="border-b border-border/70 last:border-b-0">
                    <td className="tnum py-1.5 pr-3">{band.range}</td>
                    <td className="py-1.5 pr-3 font-medium text-foreground">{band.level}</td>
                    <td className="py-1.5 text-foreground-muted">{band.detail}</td>
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
              Sanctions snapshot is {snapshotAgeDays()} days old
            </p>
            <p className="mt-0.5">
              OFAC publishes on business days. Re-run{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">npm run sync:ofac</code>{" "}
              before relying on a clear result — an absent designation in a stale
              snapshot is not a clearance.
            </p>
          </div>
        </div>
      ) : null}

      <Panel
        title="OFAC sanctions snapshot"
        description="Pulled straight from the OFAC Sanctions List Service — no hand-maintained sanctions data"
        actions={
          <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
            <ShieldAlert className="size-3.5" aria-hidden="true" />
            {formatNumber(ofacTagCount())} screenable
          </span>
        }
      >
        <div className="grid gap-3 [&>*]:min-w-0 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          <div className="space-y-2.5">
            <dl className="space-y-1.5 rounded border border-border bg-surface-2/40 p-3 text-[11px]">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-foreground-muted">Source</dt>
                <dd className="text-right font-medium text-foreground">{OFAC_SNAPSHOT.source}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-foreground-muted">List issued</dt>
                <dd className="tnum text-right font-medium text-foreground">
                  {formatDate(issued, false)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-foreground-muted">Retrieved</dt>
                <dd className="tnum text-right font-medium text-foreground">
                  {formatDate(OFAC_SNAPSHOT.retrievedAt)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-foreground-muted">Addresses in file</dt>
                <dd className="tnum text-right font-medium text-foreground">
                  {formatNumber(OFAC_SNAPSHOT.counts.total)}
                </dd>
              </div>
              {OFAC_SNAPSHOT.files.map((file) => (
                <div key={file.name} className="border-t border-border pt-1.5">
                  <p className="font-mono text-[10px] text-foreground">{file.name}</p>
                  <p className="tnum text-foreground-muted">
                    {(file.bytes / 1e6).toFixed(1)} MB · {formatNumber(file.addresses)} addresses
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
                By currency
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
                            ? "Screened by Blockchain Analysis"
                            : "Stored in the snapshot; no adapter for this chain yet"
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
                Top programmes
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
              A hit is an exact identifier match on a published address. It does not
              cover addresses controlled by a designated party but never published,
              nor entities blocked derivatively under the 50 Percent Rule — neither
              is derivable from this file.
            </p>
          </div>

          <OfacPanel rows={ofacRows} />
        </div>
      </Panel>

      <LabelFeedsPanel />

      <UserTagsPanel />
    </div>
  );
}
