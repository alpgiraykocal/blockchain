import { formatCoin, formatDate, formatNumber, formatUsd, truncateAddress } from "../format";
import { CHAINS } from "../chains/registry";
import type { AddressSummary, ChainId, Transaction } from "../types";
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

const DISCLAIMER =
  "This narrative was generated from public blockchain data and open attribution sources. It supports human review; it is not a suspicious activity determination and carries no conclusion of law. Figures cover the analysed transaction window only. Attribution and sanctions matches reflect the snapshot versions recorded in the audit block. Final review, filing decisions and any customer action remain with a qualified compliance professional.";

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
}

function subjectPhrase(input: NarrativeInput): string {
  const meta = CHAINS[input.chain];
  const label = input.address.tags.length
    ? `attributed to "${input.address.tags[0].label}"`
    : "with no attribution in the loaded label sets";
  return `${meta.name} address ${input.address.address}, ${label}`;
}

function buildChronology(input: NarrativeInput): { at: string | null; event: string }[] {
  const events: { at: string | null; event: string }[] = [];

  if (input.metrics.firstSeen) {
    events.push({
      at: input.metrics.firstSeen,
      event: `First transaction inside the analysed window.`,
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
    const direction = net.coin >= 0 ? "received" : "sent";
    events.push({
      at: tx.timestamp,
      event: `${direction === "received" ? "Received" : "Sent"} ${formatCoin(
        { ...net, coin: Math.abs(net.coin) },
        input.chain,
      )}${net.usd != null ? ` (${formatUsd(Math.abs(net.usd), true)} at the current rate)` : ""} in transaction ${truncateAddress(tx.hash, 10, 8)}.`,
    });
  }

  const dormancy = input.findings.find((f) => f.id === "dormant-then-burst" && f.matched);
  if (dormancy) {
    const period = dormancy.evidence.find((e) => e.label === "Dormant period");
    if (period) events.push({ at: null, event: `Dormant period observed: ${period.detail}` });
  }

  if (input.metrics.lastSeen) {
    events.push({
      at: input.metrics.lastSeen,
      event: "Most recent transaction inside the analysed window.",
    });
  }

  return events;
}

export function buildNarrative(input: NarrativeInput): CaseNarrative {
  const meta = CHAINS[input.chain];
  const matched = input.findings.filter((f) => f.matched && f.weight > 0);

  const summary = [
    `This review covers ${subjectPhrase(input)}.`,
    `Across ${formatNumber(input.windowSize)} of ${formatNumber(input.windowTotal)} transactions available from ${meta.explorerName}, the address received ${formatCoin(
      input.metrics.inVolume,
      input.chain,
    )} from ${input.metrics.inDegree} distinct counterparties and sent ${formatCoin(
      input.metrics.outVolume,
      input.chain,
    )} to ${input.metrics.outDegree}.`,
    input.entityAddressCount > 1
      ? `Co-spend analysis groups the address with ${input.entityAddressCount - 1} other address(es) under common control.`
      : `No co-spending partner appeared in the window, so the address stands alone as its own entity.`,
    matched.length
      ? `The activity is consistent with ${matched.length === 1 ? "one recognised pattern" : `${matched.length} recognised patterns`}: ${matched
          .map((f) => f.title.toLowerCase())
          .join(", ")}.`
      : `No typology in the detection set matched the activity in this window.`,
    input.disposition.headline + ".",
  ].join(" ");

  const sections: { heading: string; body: string }[] = [];

  sections.push({
    heading: "Subject and scope",
    body: [
      `Subject: ${input.address.address} on ${meta.name}.`,
      input.address.isContract ? "The address is a contract." : "",
      `Lifetime figures reported by ${meta.explorerName}: received ${formatCoin(input.address.totalReceived, input.chain)}, sent ${formatCoin(input.address.totalSent, input.chain)}, current balance ${formatCoin(input.address.balance, input.chain)} across ${formatNumber(input.address.txCount)} transactions.`,
      `Analysis window: ${formatDate(input.metrics.firstSeen)} to ${formatDate(input.metrics.lastSeen)}, covering ${formatNumber(input.windowSize)} transactions.`,
    ]
      .filter(Boolean)
      .join(" "),
  });

  sections.push({
    heading: "Observed activity",
    body: [
      `Counterparties: ${input.metrics.degree} distinct (${input.metrics.inDegree} sending, ${input.metrics.outDegree} receiving). ${pct(input.metrics.oneShotRatio)} appear exactly once.`,
      `Value concentration: the largest single counterparty accounts for ${pct(input.metrics.concentration)} of observed flow.`,
      `Retention: ${pct(input.metrics.passThroughRatio, 1)} of everything received has been sent on.`,
      input.metrics.medianDwellHours !== null
        ? `Median time between an inbound transaction and the next outbound one is ${input.metrics.medianDwellHours.toFixed(1)} hours.`
        : "",
      `Activity spans ${input.metrics.activeDays} distinct day(s); the busiest day carries ${input.metrics.burstScore.toFixed(1)}x the mean daily transaction count.`,
      `${pct(input.metrics.attributedRatio)} of counterparties carry attribution, of which ${input.metrics.serviceCounterparties} are known services.`,
    ]
      .filter(Boolean)
      .join(" "),
  });

  if (matched.length) {
    sections.push({
      heading: "Why this warrants attention",
      body: matched
        .map((finding) => {
          const facts = finding.evidence.map((e) => `${e.label}: ${e.detail}`).join(" ");
          return `${finding.title} (${finding.family}, ${finding.stage} stage). ${finding.summary} ${facts}`.trim();
        })
        .join("\n\n"),
    });

    sections.push({
      heading: "Alternative explanations considered",
      body: matched
        .flatMap((finding) => finding.counterIndicators.map((c) => `${finding.title}: ${c}`))
        .join("\n"),
    });
  } else {
    sections.push({
      heading: "Why no pattern was raised",
      body: "No detector in the set matched the activity in this window. This is a negative result over a bounded slice of history and over the attribution loaded at the time of review, not a clearance.",
    });
  }

  sections.push({
    heading: "Recommended disposition",
    body: [
      `${input.disposition.headline}.`,
      input.disposition.drivers.length
        ? `Drivers: ${input.disposition.drivers.join(" ")}`
        : "",
      input.disposition.mitigants.length
        ? `Mitigating factors: ${input.disposition.mitigants.join(" ")}`
        : "",
      `Next steps: ${input.disposition.nextSteps.join(" ")}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  sections.push({
    heading: "Residual uncertainty",
    body: input.disposition.wouldChangeIf.map((item) => `- ${item}`).join("\n"),
  });

  return {
    summary,
    chronology: buildChronology(input),
    sections,
    disclaimer: DISCLAIMER,
  };
}

/** Renders the case file as Markdown for export into a case management system. */
export function narrativeToMarkdown(
  narrative: CaseNarrative,
  heading: string,
  audit: Record<string, unknown>,
): string {
  const lines = [
    `# ${heading}`,
    "",
    narrative.summary,
    "",
    "## Chronology",
    "",
    ...narrative.chronology.map(
      (entry) => `- **${entry.at ? formatDate(entry.at) : "Undated"}** - ${entry.event}`,
    ),
    "",
    ...narrative.sections.flatMap((section) => [`## ${section.heading}`, "", section.body, ""]),
    "## Audit",
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

export { DISCLAIMER };
