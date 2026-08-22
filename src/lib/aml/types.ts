import type { ChainId, RiskLevel, Tag, Value } from "../types";

/**
 * Types for the AML/CTF investigation layer.
 *
 * Everything here supports human suspicion and reporting. Nothing here decides
 * that an actor committed a crime, and no field should ever be read that way:
 * scores are triage aids, typology matches are "consistent with" findings, and
 * the disposition is a recommendation for an analyst to accept or reject.
 */

/** Where in the money-laundering lifecycle an observed pattern sits. */
export type LifecycleStage = "placement" | "layering" | "integration" | "unclear";

/** Typology families, named so a finding maps onto language a compliance team
 *  already uses rather than onto a bespoke vocabulary. */
export type TypologyId =
  | "sanctions-exposure"
  | "mixer-exposure"
  | "peel-chain"
  | "rapid-pass-through"
  | "funnel-aggregation"
  | "dispersal-fan-out"
  | "uniform-amount-layering"
  | "dormant-then-burst"
  | "round-tripping"
  | "off-graph-continuation"
  | "dusting-inbound"
  | "chain-hopping";

export type FindingStrength = "indicative" | "supporting" | "weak";

/** A single observed fact behind a finding. Every material claim in the output
 *  must trace back to one of these so a reviewer can re-check it. */
export interface Evidence {
  label: string;
  detail: string;
  /** Where the fact came from, so observed and inferred never blur together. */
  basis: "observed" | "derived" | "attribution";
}

export interface TypologyFinding {
  id: TypologyId;
  title: string;
  family: string;
  stage: LifecycleStage;
  matched: boolean;
  strength: FindingStrength;
  /** 0..100 triage weight. Never a probability of criminality. */
  weight: number;
  summary: string;
  evidence: Evidence[];
  /** Facts that argue against the pattern, or innocent explanations that fit it
   *  just as well. Omitting these is how a report stops being defensible. */
  counterIndicators: string[];
}

/* ------------------------------------------------------------------ metrics */

export interface EgoMetrics {
  /** Distinct counterparties in the analysed window. */
  degree: number;
  inDegree: number;
  outDegree: number;
  inVolume: Value;
  outVolume: Value;
  /** Inbound counterparties over total - convergence indicator. */
  fanInRatio: number;
  fanOutRatio: number;
  /** Share of value that left again, a dwell proxy for pass-through behaviour. */
  passThroughRatio: number;
  /** Median hours between an inbound transaction and the next outbound one. */
  medianDwellHours: number | null;
  /** Fraction of counterparties seen exactly once. */
  oneShotRatio: number;
  /** Largest single counterparty's share of observed value. */
  concentration: number;
  /** Busiest day's transaction count against the daily mean over the window. */
  burstScore: number;
  /** Counterparties that are themselves tagged, over total. */
  attributedRatio: number;
  /** Counterparties tagged as a known service - the noisy hubs. */
  serviceCounterparties: number;
  /**
   * Proximity to attributed risk, at one hop.
   *
   * Two plain numbers rather than a composite: how many direct counterparties
   * carry an abuse tag or a mixer category, and what share of observed flow
   * moved through them.
   * Count alone treats a dusting spray and a funding transfer alike; share
   * alone hides a single small transfer to a sanctioned party. Both are
   * re-derivable by hand from the same window.
   */
  riskyCounterparties: number;
  riskyValueShare: number;
  activeDays: number;
  firstSeen: string | null;
  lastSeen: string | null;
}

/* -------------------------------------------------------------- disposition */

export type DispositionAction =
  | "escalate"
  | "enhanced-review"
  | "monitor"
  | "no-action";

export interface Disposition {
  action: DispositionAction;
  /** 0..100 triage priority. A queue-ordering aid, not a filing trigger. */
  priority: number;
  level: RiskLevel;
  headline: string;
  drivers: string[];
  mitigants: string[];
  /** What evidence would move this recommendation either way. */
  wouldChangeIf: string[];
  nextSteps: string[];
}

/* ------------------------------------------------------------- ego network */

export interface EgoTimeWindow {
  start: string | null;
  end: string | null;
  /** True when the window is the explorer's page rather than an analyst choice. */
  boundedBySource: boolean;
}

export interface EgoFilters {
  hopDepth: 1 | 2;
  maxNodes: number;
  maxEdges: number;
  /** Neighbours pulled per ring, highest priority first. */
  topK: number;
  minValueCoin: number;
  direction: "both" | "in" | "out";
  /** Dampen exchanges, tokens and pools, which are hubs by construction. */
  suppressServiceHubs: boolean;
}

export interface EgoNode {
  id: string;
  chain: ChainId;
  address: string;
  label: string | null;
  /** 0 = centre, 1 = first ring, 2 = second ring. Drives the radial layout. */
  ring: number;
  /** Deterministic position within the ring so the layout is reproducible. */
  ringIndex: number;
  kind: string;
  riskScore: number;
  riskLevel: RiskLevel;
  tags: Tag[];
  /** Composite of risk, value and recency. Triage aid only. */
  priority: number;
  isServiceHub: boolean;
  txCount: number;
  value: Value;
  direction: "in" | "out" | "both" | "self";
  expandable: boolean;
}

export interface EgoEdge {
  id: string;
  source: string;
  target: string;
  txCount: number;
  value: Value;
  firstSeen: string | null;
  lastSeen: string | null;
  direction: "in" | "out";
  ring: number;
}

/** Every reduction applied, so a reader never mistakes the rendered graph for
 *  the whole picture. */
export interface ReductionStep {
  rule: string;
  removed: number;
  detail: string;
}

export interface EgoNetwork {
  centre: EgoNode;
  nodes: EgoNode[];
  edges: EgoEdge[];
  metrics: EgoMetrics;
  filters: EgoFilters;
  window: EgoTimeWindow;
  reduction: ReductionStep[];
  truncated: boolean;
  /** Neighbours the source could not supply, with the reason. */
  incomplete: { address: string; reason: string }[];
}

/* -------------------------------------------------------------------- audit */

/** Recorded on every assessment so a conclusion can be reproduced against the
 *  exact data state that produced it. */
export interface AuditRecord {
  assessmentId: string;
  generatedAt: string;
  subject: { chain: ChainId; address: string; entityId: string | null };
  layoutVersion: string;
  engineVersion: string;
  filters: EgoFilters;
  window: EgoTimeWindow;
  reductionApplied: string[];
  dataSources: {
    explorer: string;
    sanctionsList: string;
    sanctionsIssued: string | null;
    sanctionsRetrieved: string;
    labelSnapshot: string;
    labelSources: { id: string; version: string | null }[];
  };
  /** Reserved for host applications that authenticate their analysts. */
  analyst: string | null;
}

/* ------------------------------------------------------------- assessment */

export interface AmlAssessment {
  subject: {
    chain: ChainId;
    address: string;
    label: string | null;
    entityId: string | null;
    entityAddressCount: number;
    balance: Value;
    totalReceived: Value;
    totalSent: Value;
    txCount: number;
    isContract: boolean;
    tags: Tag[];
  };
  metrics: EgoMetrics;
  findings: TypologyFinding[];
  disposition: Disposition;
  narrative: CaseNarrative;
  audit: AuditRecord;
  /** Structured state of the underlying data, so the UI can explain a thin or
   *  empty result instead of rendering one that merely looks broken. */
  dataHealth: {
    txsAnalysed: number;
    txsTotal: number;
    /** Non-null when the explorer could not serve the transaction list at all. */
    txsUnavailable: string | null;
    clusterPartial: boolean;
    totalsWindowed: boolean;
  };
  /** Limits of the underlying data, restated where the conclusion is drawn. */
  limitations: string[];
}

export interface CaseNarrative {
  /** Chronological, factual prose. No conclusions of law, no accusation. */
  summary: string;
  chronology: { at: string | null; event: string }[];
  sections: { heading: string; body: string }[];
  disclaimer: string;
}
