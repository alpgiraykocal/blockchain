import { formatCoin, formatDate, formatNumber, formatUsd, truncateAddress } from "../format";
import { CHAINS } from "../chains/registry";
import type { AddressSummary, ChainId, Transaction } from "../types";
import type { AmlCopy } from "./copy";
import { pct } from "./metrics";
import type { CaseNarrative, Disposition, EgoMetrics, TypologyFinding } from "./types";

/**
 * Case narrative.
 *
 * Written the way a SAR/STR narrative is written: who, what, when, where, how
 * much, and why it is suspicious, in plain chronological prose. It states facts
 * and calibrated observations, never conclusions of law, and never asserts that
 * anyone laundered anything. It is a draft for a human to review, edit and own.
 */

export interface NarrativeInput {
  chain: ChainId;
  address: AddressSummary;
  entityAddressCount: number;
  transactions: Transaction[];
  metrics: EgoMetrics;
  findings: TypologyFinding[];
  disposition: Disposition;
  windowSize: number;
  windowTotal: number;
  /** Copy for the active locale. The narrative is drafted for a human reviewer
   *  and exported into a case file, so it is written in their language. */
  copy: AmlCopy;
  /** Locale tag for the dates the narrative embeds. */
  locale: string;
}

function subjectPhrase(input: NarrativeInput): string {
  const t = input.copy.narrative;
  const meta = CHAINS[input.chain];
  const label = input.address.tags.length
    ? t.attributedTo(input.address.tags[0].label)
    : t.noAttribution;
  return t.subjectPhrase(meta.name, input.address.address, label);
}

function buildChronology(input: NarrativeInput): { at: string | null; event: string }[] {
  const t = input.copy.narrative;
  const events: { at: string | null; event: string }[] = [];

  if (input.metrics.firstSeen) {
    events.push({
      at: input.metrics.firstSeen,
      event: t.firstTx,
    });
  }

  // Largest movements carry the narrative; listing every transaction would bury
  // the reviewer rather than inform them.
  const notable = [...input.transactions]
    .filter((tx) => tx.timestamp && tx.netForAddress)
    .sort((a, b) => Math.abs(b.netForAddress!.coin) - Math.abs(a.netForAddress!.coin))
    .slice(0, 5)
    .sort((a, b) => (a.timestamp! < b.timestamp! ? -1 : 1));

  for (const tx of notable) {
    const net = tx.netForAddress!;
    events.push({
      at: tx.timestamp,
      event: t.largestMovement(
        net.coin >= 0 ? t.directionIn : t.directionOut,
        formatCoin({ ...net, coin: Math.abs(net.coin) }, input.chain),
        net.usd != null ? t.atCurrentRate(formatUsd(Math.abs(net.usd), true)) : "",
        truncateAddress(tx.hash, 10, 8),
      ),
    });
  }

  const dormancy = input.findings.find((f) => f.id === "dormant-then-burst" && f.matched);
  if (dormancy) {
    // Matched on the translated label the detector emitted, not on the English
    // one, or the chronology would silently lose this entry in every other
    // language.
    const period = dormancy.evidence.find(
      (e) => e.label === input.copy.typology.dormant.evDormant,
    );
    if (period) events.push({ at: null, event: t.dormantObserved(period.detail) });
  }

  if (input.metrics.lastSeen) {
    events.push({
      at: input.metrics.lastSeen,
      event: t.lastTx,
    });
  }

  return events;
}

export function buildNarrative(input: NarrativeInput): CaseNarrative {
  const t = input.copy.narrative;
  const meta = CHAINS[input.chain];
  const matched = input.findings.filter((f) => f.matched && f.weight > 0);

  const summary = [
    t.reviewCovers(subjectPhrase(input)),
    t.volumeLine(
      formatNumber(input.windowSize),
      formatNumber(input.windowTotal),
      meta.explorerName,
      formatCoin(input.metrics.inVolume, input.chain),
      input.metrics.inDegree,
      formatCoin(input.metrics.outVolume, input.chain),
      input.metrics.outDegree,
    ),
    input.entityAddressCount > 1
      ? t.coSpend(input.entityAddressCount - 1)
      : t.noCoSpend,
    matched.length
      ? t.consistentWith(
          matched.length,
          matched.map((f) => f.title.toLocaleLowerCase(input.locale)).join(", "),
        )
      : t.noTypologyMatched,
    input.disposition.headline + ".",
  ].join(" ");

  const sections: { heading: string; body: string }[] = [];

  sections.push({
    heading: t.headingScope,
    body: [
      t.subjectLine(input.address.address, meta.name),
      input.address.isContract ? t.isContract : "",
      t.lifetimeFigures(
        meta.explorerName,
        formatCoin(input.address.totalReceived, input.chain),
        formatCoin(input.address.totalSent, input.chain),
        formatCoin(input.address.balance, input.chain),
        formatNumber(input.address.txCount),
      ),
      t.windowLine(
        formatDate(input.metrics.firstSeen, true, input.locale),
        formatDate(input.metrics.lastSeen, true, input.locale),
        formatNumber(input.windowSize),
      ),
    ]
      .filter(Boolean)
      .join(" "),
  });

  sections.push({
    heading: t.headingActivity,
    body: [
      t.counterpartiesLine(
        input.metrics.degree,
        input.metrics.inDegree,
        input.metrics.outDegree,
        pct(input.metrics.oneShotRatio),
      ),
      t.concentrationLine(pct(input.metrics.concentration)),
      t.retentionLine(pct(input.metrics.passThroughRatio, 1)),
      input.metrics.medianDwellHours !== null
        ? t.dwellLine(input.metrics.medianDwellHours.toFixed(1))
        : "",
      t.activityLine(input.metrics.activeDays, input.metrics.burstScore.toFixed(1)),
      t.attributionLine(pct(input.metrics.attributedRatio), input.metrics.serviceCounterparties),
    ]
      .filter(Boolean)
      .join(" "),
  });

  if (matched.length) {
    sections.push({
      heading: t.headingWhy,
      body: matched
        .map((finding) => {
          const facts = finding.evidence.map((e) => t.factLine(e.label, e.detail)).join(" ");
          return t
            .findingLine(
              finding.title,
              finding.family,
              input.copy.stage[finding.stage],
              finding.summary,
              facts,
            )
            .trim();
        })
        .join("\n\n"),
    });

    sections.push({
      heading: t.headingAlternatives,
      body: matched
        .flatMap((finding) => finding.counterIndicators.map((c) => t.counterLine(finding.title, c)))
        .join("\n"),
    });
  } else {
    sections.push({
      heading: t.headingNoPattern,
      body: t.noPatternBody,
    });
  }

  sections.push({
    heading: t.headingDisposition,
    body: [
      `${input.disposition.headline}.`,
      input.disposition.drivers.length
        ? t.driversLine(input.disposition.drivers.join(" "))
        : "",
      input.disposition.mitigants.length
        ? t.mitigantsLine(input.disposition.mitigants.join(" "))
        : "",
      t.nextStepsLine(input.disposition.nextSteps.join(" ")),
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  sections.push({
    heading: t.headingUncertainty,
    body: input.disposition.wouldChangeIf.map((item) => `- ${item}`).join("\n"),
  });

  return {
    summary,
    chronology: buildChronology(input),
    sections,
    disclaimer: t.disclaimer,
  };
}

/** Renders the case file as Markdown for export into a case management system. */
export function narrativeToMarkdown(
  narrative: CaseNarrative,
  heading: string,
  audit: Record<string, unknown>,
  copy: AmlCopy,
  locale = "en",
): string {
  const lines = [
    `# ${heading}`,
    "",
    narrative.summary,
    "",
    `## ${copy.narrative.mdChronology}`,
    "",
    ...narrative.chronology.map(
      (entry) =>
        `- **${entry.at ? formatDate(entry.at, true, locale) : copy.narrative.undated}** - ${entry.event}`,
    ),
    "",
    ...narrative.sections.flatMap((section) => [`## ${section.heading}`, "", section.body, ""]),
    `## ${copy.narrative.mdAudit}`,
    "",
    "```json",
    JSON.stringify(audit, null, 2),
    "```",
    "",
    "---",
    "",
    `_${narrative.disclaimer}_`,
    "",
  ];
  return lines.join("\n");
}
