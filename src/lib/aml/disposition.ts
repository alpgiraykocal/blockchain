import { levelFor } from "../risk";
import { formatCoin } from "../format";
import type { AddressSummary, ChainId } from "../types";
import { pct } from "./metrics";
import type { Disposition, EgoMetrics, TypologyFinding } from "./types";

/**
 * Alert disposition.
 *
 * The recommendation below orders an analyst's queue and says why. It is not a
 * filing trigger and not a finding of criminality; a human decides whether to
 * escalate, and a qualified compliance professional owns anything that follows.
 */

export interface DispositionInput {
  chain: ChainId;
  address: AddressSummary;
  metrics: EgoMetrics;
  findings: TypologyFinding[];
  subjectIsKnownService: boolean;
  sanctionsSnapshotStale: boolean;
  windowComplete: boolean;
}

export function decideDisposition(input: DispositionInput): Disposition {
  const matched = input.findings.filter((finding) => finding.matched && finding.weight > 0);

  // The strongest single finding sets the priority. Summing would let a pile of
  // weak structural observations outrank one sanctions match, which inverts how
  // an analyst should actually read the queue.
  const priority = matched.reduce((max, finding) => Math.max(max, finding.weight), 0);

  const sanctionsDirect = input.address.tags.some((tag) => tag.abuse === "sanctions");
  const sanctionsNearby = matched.some((finding) => finding.id === "sanctions-exposure");

  const action: Disposition["action"] = sanctionsDirect
    ? "escalate"
    : sanctionsNearby || priority >= 70
      ? "escalate"
      : priority >= 45
        ? "enhanced-review"
        : priority >= 25
          ? "monitor"
          : "no-action";

  const drivers = matched.map((finding) => `${finding.title}: ${finding.summary}`);

  const mitigants: string[] = [];
  if (input.subjectIsKnownService) {
    mitigants.push(
      "The subject is an attributed service. High turnover, convergence and dispersal are its expected operating shape, and structural findings have been de-weighted accordingly.",
    );
  }
  if (!sanctionsDirect && !sanctionsNearby) {
    mitigants.push(
      "No direct or one-hop match against the loaded OFAC snapshot, subject to the snapshot's own coverage limits.",
    );
  }
  if (input.metrics.attributedRatio >= 0.5) {
    mitigants.push(
      `${pct(input.metrics.attributedRatio)} of counterparties are attributed to named actors rather than unknown addresses, which narrows the unexplained surface.`,
    );
  }
  if (input.address.balance.coin > 0 && input.metrics.passThroughRatio < 0.6) {
    mitigants.push(
      `The address retains ${formatCoin(input.address.balance, input.chain)}, which is inconsistent with pure conduit behaviour.`,
    );
  }
  for (const finding of matched.slice(0, 3)) {
    for (const counter of finding.counterIndicators.slice(0, 1)) mitigants.push(counter);
  }

  const wouldChangeIf: string[] = [];
  if (!input.windowComplete) {
    wouldChangeIf.push(
      "The full transaction history is reviewed. The analysis window is a bounded slice from the block explorer, and a pattern outside it cannot fire a detector.",
    );
  }
  if (input.sanctionsSnapshotStale) {
    wouldChangeIf.push(
      "The sanctions snapshot is refreshed. It is currently older than the review threshold, so a recent designation may be missing.",
    );
  }
  wouldChangeIf.push(
    "Customer information is available. Every structural finding here describes shape only; it becomes meaningful once measured against a stated business profile and expected activity.",
  );
  if (matched.some((finding) => finding.id === "off-graph-continuation")) {
    wouldChangeIf.push(
      "The receiving institution supplies the onward record for value that left to a custodian.",
    );
  }

  const nextSteps: string[] = [];
  if (action === "escalate") {
    nextSteps.push(
      sanctionsDirect
        ? "Treat as a sanctions hit: stop the activity, confirm the match against the current OFAC list, and route to sanctions counsel for a blocking or rejection determination."
        : "Escalate to a senior analyst with this case file attached.",
      "Preserve the evidence: export the assessment and record the list and label snapshot versions it was produced against.",
    );
  } else if (action === "enhanced-review") {
    nextSteps.push(
      "Apply enhanced due diligence: establish who controls the address and whether the observed activity matches a stated purpose.",
      "Expand the network by one hop on the highest-priority counterparties before deciding.",
    );
  } else if (action === "monitor") {
    nextSteps.push(
      "Record the observation and re-check on a defined interval rather than opening a case now.",
      "Set a trigger for a material change in counterparty mix or transaction size.",
    );
  } else {
    nextSteps.push(
      "No action indicated on the evidence in this window. Document the review so the negative result is auditable.",
    );
  }

  const headline =
    action === "escalate"
      ? sanctionsDirect
        ? "Sanctions list match on the subject address"
        : "Findings warrant escalation to a senior analyst"
      : action === "enhanced-review"
        ? "Findings warrant enhanced due diligence before disposition"
        : action === "monitor"
          ? "Weak signal only; monitor rather than open a case"
          : "No pattern of concern in the analysed window";

  return {
    action,
    priority,
    level: levelFor(priority),
    headline,
    drivers: drivers.length ? drivers : ["No typology matched in the analysed window."],
    mitigants,
    wouldChangeIf,
    nextSteps,
  };
}

export const DISPOSITION_LABEL: Record<Disposition["action"], string> = {
  escalate: "Escalate",
  "enhanced-review": "Enhanced review",
  monitor: "Monitor",
  "no-action": "No action",
};
