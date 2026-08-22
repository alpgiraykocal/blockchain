import { levelFor } from "../risk";
import { formatCoin } from "../format";
import type { AddressSummary, ChainId } from "../types";
import { pct } from "./metrics";
import type { AmlCopy } from "./copy";
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
  /** Copy for the active locale. The recommendation is read by a person and
   *  lands in a case file, so it is written in their language. */
  copy: AmlCopy;
}

export function decideDisposition(input: DispositionInput): Disposition {
  const t = input.copy.disposition;
  // Two different questions, so two different sets. `weighted` drives the
  // priority and the drivers list. `matched` is every detector that fired,
  // including the ones that carry no weight by design - off-graph continuation
  // is an orientation finding, not a suspicion one, and reading it out of the
  // weighted set meant its follow-up step could never fire.
  const matched = input.findings.filter((finding) => finding.matched);
  const weighted = matched.filter((finding) => finding.weight > 0);

  // The strongest single finding sets the priority. Summing would let a pile of
  // weak structural observations outrank one sanctions match, which inverts how
  // an analyst should actually read the queue.
  const priority = weighted.reduce((max, finding) => Math.max(max, finding.weight), 0);

  const sanctionsDirect = input.address.tags.some((tag) => tag.abuse === "sanctions");
  const sanctionsNearby = weighted.some((finding) => finding.id === "sanctions-exposure");

  const action: Disposition["action"] = sanctionsDirect
    ? "escalate"
    : sanctionsNearby || priority >= 70
      ? "escalate"
      : priority >= 45
        ? "enhanced-review"
        : priority >= 25
          ? "monitor"
          : "no-action";

  const drivers = weighted.map((finding) => t.driver(finding.title, finding.summary));

  const mitigants: string[] = [];
  if (input.subjectIsKnownService) {
    mitigants.push(t.mitigantService);
  }
  if (!sanctionsDirect && !sanctionsNearby) {
    mitigants.push(t.mitigantNoSanctions);
  }
  if (input.metrics.attributedRatio >= 0.5) {
    mitigants.push(t.mitigantAttributed(pct(input.metrics.attributedRatio)));
  }
  if (input.address.balance.coin > 0 && input.metrics.passThroughRatio < 0.6) {
    mitigants.push(t.mitigantRetains(formatCoin(input.address.balance, input.chain)));
  }
  for (const finding of weighted.slice(0, 3)) {
    for (const counter of finding.counterIndicators.slice(0, 1)) mitigants.push(counter);
  }

  const wouldChangeIf: string[] = [];
  if (!input.windowComplete) {
    wouldChangeIf.push(t.changeWindow);
  }
  if (input.sanctionsSnapshotStale) {
    wouldChangeIf.push(t.changeSnapshot);
  }
  wouldChangeIf.push(t.changeCustomerInfo);
  if (matched.some((finding) => finding.id === "off-graph-continuation")) {
    wouldChangeIf.push(t.changeCustodian);
  }

  const nextSteps: string[] = [];
  if (action === "escalate") {
    nextSteps.push(
      sanctionsDirect ? t.stepSanctionsHit : t.stepEscalate,
      t.stepPreserve,
    );
  } else if (action === "enhanced-review") {
    nextSteps.push(t.stepEdd, t.stepExpand);
  } else if (action === "monitor") {
    nextSteps.push(t.stepMonitorRecord, t.stepMonitorTrigger);
  } else {
    nextSteps.push(t.stepNoAction);
  }

  const headline =
    action === "escalate"
      ? sanctionsDirect
        ? t.headlineSanctions
        : t.headlineEscalate
      : action === "enhanced-review"
        ? t.headlineEdd
        : action === "monitor"
          ? t.headlineMonitor
          : t.headlineNoAction;

  return {
    action,
    priority,
    level: levelFor(priority),
    headline,
    drivers: drivers.length ? drivers : [t.noTypology],
    mitigants,
    wouldChangeIf,
    nextSteps,
  };
}
