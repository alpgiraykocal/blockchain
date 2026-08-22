import type { NeighborRow } from "../analysis";
import { formatCoin, formatDate, formatNumber } from "../format";
import type { AddressSummary, ChainId, Tag, Transaction } from "../types";
import type { AmlCopy } from "./copy";
import { pct } from "./metrics";
import type { Evidence, EgoMetrics, TypologyFinding, TypologyId } from "./types";

/**
 * Typology detectors.
 *
 * Each detector answers one question: does the observed activity fit a pattern a
 * compliance team already has a name for? A match is a lead, never a
 * conclusion — so every detector carries the facts that support it, and the
 * facts or ordinary explanations that argue against it.
 *
 * Detectors read a bounded transaction window from a public explorer. A pattern
 * that needs more history than the window holds will not fire, and absence of a
 * finding is never evidence of absence.
 */

const DAY_MS = 86_400_000;

export interface TypologyInput {
  chain: ChainId;
  address: AddressSummary;
  transactions: Transaction[];
  neighbors: NeighborRow[];
  metrics: EgoMetrics;
  /** Cluster members that a second hop returned to, when a 2-hop walk ran. */
  returnPaths: { via: string; back: string }[];
  /** True when the subject itself is a tagged exchange, pool, token or bridge. */
  subjectIsKnownService: boolean;
  windowComplete: boolean;
  /** Copy for the active locale. Findings are read by an analyst and quoted in
   *  a case file, so their prose follows the interface language. */
  copy: AmlCopy;
  /** Locale tag for the dates the detectors embed in evidence. */
  locale: string;
}

function observed(label: string, detail: string): Evidence {
  return { label, detail, basis: "observed" };
}
function derived(label: string, detail: string): Evidence {
  return { label, detail, basis: "derived" };
}
function attribution(label: string, detail: string): Evidence {
  return { label, detail, basis: "attribution" };
}

const SERVICE_CATEGORIES = ["exchange", "mining-pool", "token", "defi", "bridge", "wallet-service"];

function taggedAs(tags: Tag[], predicate: (tag: Tag) => boolean): Tag | undefined {
  return tags.find(predicate);
}

/* ------------------------------------------------------------- detectors */

function sanctionsExposure(input: TypologyInput): TypologyFinding {
  const t = input.copy.typology.sanctions;
  const direct = input.address.tags.filter((tag) => tag.abuse === "sanctions");
  const exposed = input.neighbors.filter((row) =>
    row.node.tags.some((tag) => tag.abuse === "sanctions"),
  );

  const evidence: Evidence[] = [];
  for (const tag of direct) {
    evidence.push(attribution(t.evSubjectListed, `${tag.label}. ${tag.notes ?? ""}`.trim()));
  }

  // Direction is the whole finding here. Value moving *to* a listed party is a
  // potential prohibited transaction; value arriving *from* one is exposure the
  // subject may have had no part in, and at negligible amounts is more often
  // dusting - a listed address spraying tiny sums to taint recipients.
  const outbound = exposed.filter((row) => row.direction === "out");
  const inbound = exposed.filter((row) => row.direction === "in");
  const inboundOnlyDust = inbound.every((row) => row.link.value.usd !== null && row.link.value.usd < 1);

  for (const row of exposed.slice(0, 5)) {
    const tag = row.node.tags.find((t) => t.abuse === "sanctions")!;
    const amount = t.amount(formatCoin(row.link.value, input.chain), row.link.txCount);
    evidence.push(
      attribution(
        row.direction === "out" ? t.evSentTo(tag.label) : t.evReceivedFrom(tag.label),
        row.direction === "out" ? t.evSentDetail(amount) : t.evReceivedDetail(amount),
      ),
    );
  }

  const matched = direct.length > 0 || exposed.length > 0;

  const weight = direct.length
    ? 100
    : outbound.length
      ? 85
      : inbound.length
        ? inboundOnlyDust
          ? 35
          : 65
        : 0;

  return {
    id: "sanctions-exposure",
    title: t.title,
    family: t.family,
    stage: "unclear",
    matched,
    strength: direct.length || outbound.length ? "indicative" : matched ? "supporting" : "weak",
    weight,
    summary: direct.length
      ? t.summaryDirect
      : outbound.length
        ? t.summaryOutbound(outbound.length)
        : inbound.length
          ? inboundOnlyDust
            ? t.summaryInboundDust(inbound.length)
            : t.summaryInbound(inbound.length)
          : t.summaryNone,
    evidence,
    counterIndicators: matched
      ? [
          ...(inbound.length && !outbound.length && !direct.length
            ? [t.counterInbound, ...(inboundOnlyDust ? [t.counterDust] : [])]
            : []),
          t.counterIdentifier,
          t.counterCoverage,
        ]
      : [t.counterClear],
  };
}

function mixerExposure(input: TypologyInput): TypologyFinding {
  const t = input.copy.typology.mixer;
  const isMixer = taggedAs(
    input.address.tags,
    (tag) => tag.category === "mixer" || tag.abuse === "mixer",
  );
  const counterparties = input.neighbors.filter((row) =>
    row.node.tags.some((tag) => tag.category === "mixer" || tag.abuse === "mixer"),
  );

  const evidence: Evidence[] = [];
  if (isMixer) {
    evidence.push(attribution(t.evSubjectIsMixer, isMixer.label));
  }
  for (const row of counterparties.slice(0, 5)) {
    evidence.push(
      attribution(
        row.direction === "in"
          ? t.evReceivedFrom(row.node.label ?? t.fallbackLabel)
          : t.evSentTo(row.node.label ?? t.fallbackLabel),
        t.evDetail(formatCoin(row.link.value, input.chain), row.link.txCount),
      ),
    );
  }

  const matched = Boolean(isMixer) || counterparties.length > 0;
  return {
    id: "mixer-exposure",
    title: t.title,
    family: t.family,
    stage: "layering",
    matched,
    strength: matched ? "indicative" : "weak",
    weight: matched ? (isMixer ? 70 : 65) : 0,
    summary: matched ? t.summaryMatched : t.summaryNone,
    evidence,
    counterIndicators: matched
      ? [t.counterLawful, t.counterAttribution]
      : [],
  };
}

/** A peel chain spends a large balance repeatedly, sending a small slice onward
 *  each time and forwarding the remainder to a fresh change address. In the tx
 *  structure it shows as a run of two-output spends where one output holds most
 *  of the value. */
function peelChain(input: TypologyInput): TypologyFinding {
  const t = input.copy.typology.peelChain;
  if (input.chain !== "btc") {
    return {
      id: "peel-chain",
      title: t.title,
      family: t.family,
      stage: "layering",
      matched: false,
      strength: "weak",
      weight: 0,
      summary: t.summaryNotUtxo,
      evidence: [],
      counterIndicators: [],
    };
  }

  const peels = input.transactions.filter((tx) => {
    if (tx.direction !== "out" || tx.outputs.length !== 2) return false;
    const values = tx.outputs.map((out) => out.value.coin).sort((a, b) => b - a);
    const total = values[0] + values[1];
    return total > 0 && values[0] / total >= 0.8;
  });

  const matched = peels.length >= 3;
  return {
    id: "peel-chain",
    title: t.title,
    family: t.family,
    stage: "layering",
    matched,
    strength: peels.length >= 6 ? "indicative" : matched ? "supporting" : "weak",
    weight: matched ? Math.min(60, 25 + peels.length * 4) : 0,
    summary: matched ? t.summaryMatched(peels.length) : t.summaryNone,
    evidence: matched
      ? [
          derived(
            t.evRepeated,
            t.evRepeatedDetail(peels.length, input.transactions.length),
          ),
          observed(
            t.evExample,
            t.evExampleDetail(peels[0].hash, formatDate(peels[0].timestamp, false, input.locale)),
          ),
        ]
      : [],
    counterIndicators: matched
      ? [t.counterOrdinary, t.counterBatching]
      : [],
  };
}

function rapidPassThrough(input: TypologyInput): TypologyFinding {
  const t = input.copy.typology.passThrough;
  const { metrics } = input;
  const dwell = metrics.medianDwellHours;
  const matched =
    metrics.passThroughRatio >= 0.95 &&
    input.address.txCount >= 6 &&
    dwell !== null &&
    dwell <= 48;

  const evidence: Evidence[] = [];
  if (matched) {
    evidence.push(
      derived(
        t.evNothingRetained,
        t.evNothingRetainedDetail(
          pct(metrics.passThroughRatio, 1),
          formatCoin(input.address.balance, input.chain),
        ),
      ),
      derived(t.evShortDwell, t.evShortDwellDetail(dwell!.toFixed(1))),
      observed(t.evTurnover, t.evTurnoverDetail(formatNumber(input.address.txCount))),
    );
  }

  return {
    id: "rapid-pass-through",
    title: t.title,
    family: t.family,
    stage: "layering",
    matched,
    strength: matched && dwell !== null && dwell <= 6 ? "indicative" : matched ? "supporting" : "weak",
    weight: matched ? 55 : 0,
    summary: matched ? t.summaryMatched : t.summaryNone,
    evidence,
    counterIndicators: matched
      ? [t.counterCustodial, t.counterWindow]
      : [],
  };
}

function funnelAggregation(input: TypologyInput): TypologyFinding {
  const t = input.copy.typology.funnel;
  const { metrics } = input;
  const matched =
    metrics.inDegree >= 10 && metrics.inDegree >= Math.max(5, metrics.outDegree * 5);

  return {
    id: "funnel-aggregation",
    title: t.title,
    family: t.family,
    stage: "placement",
    matched,
    strength: metrics.inDegree >= 25 && matched ? "indicative" : matched ? "supporting" : "weak",
    weight: matched ? 45 : 0,
    summary: matched
      ? t.summaryMatched(metrics.inDegree, metrics.outDegree)
      : t.summaryNone,
    evidence: matched
      ? [
          derived(t.evConvergent, t.evConvergentDetail(pct(metrics.fanInRatio), metrics.degree)),
          derived(t.evNonRepeating, t.evNonRepeatingDetail(pct(metrics.oneShotRatio))),
        ]
      : [],
    counterIndicators: matched
      ? [t.counterByDesign, t.counterProfile]
      : [],
  };
}

function dispersalFanOut(input: TypologyInput): TypologyFinding {
  const t = input.copy.typology.dispersal;
  const { metrics } = input;
  const matched =
    metrics.outDegree >= 10 && metrics.outDegree >= Math.max(5, metrics.inDegree * 5);

  return {
    id: "dispersal-fan-out",
    title: t.title,
    family: t.family,
    stage: "layering",
    matched,
    strength: metrics.outDegree >= 25 && matched ? "indicative" : matched ? "supporting" : "weak",
    weight: matched ? 45 : 0,
    summary: matched
      ? t.summaryMatched(metrics.outDegree, metrics.inDegree)
      : t.summaryNone,
    evidence: matched
      ? [
          derived(t.evDivergent, t.evDivergentDetail(pct(metrics.fanOutRatio), metrics.degree)),
        ]
      : [],
    counterIndicators: matched
      ? [t.counterByDesign]
      : [],
  };
}

/** Repeated near-identical amounts are a layering fingerprint: value split into
 *  uniform slices to move it without any single transfer standing out. */
function uniformAmountLayering(input: TypologyInput): TypologyFinding {
  const t = input.copy.typology.uniform;
  const amounts = input.transactions
    .map((tx) => Math.abs(tx.netForAddress?.coin ?? 0))
    .filter((value) => value > 0);

  if (amounts.length < 5) {
    return emptyFinding(
      "uniform-amount-layering",
      t.title,
      t.family,
      "layering",
      t.summaryTooFew,
    );
  }

  // Bucket to three significant figures so near-identical amounts group without
  // demanding exact equality, which fees alone would prevent.
  const buckets = new Map<string, number>();
  for (const amount of amounts) {
    const key = amount.toPrecision(3);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const [topAmount, topCount] = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0];
  const share = topCount / amounts.length;
  const matched = topCount >= 5 && share >= 0.4;

  return {
    id: "uniform-amount-layering",
    title: t.title,
    family: t.family,
    stage: "layering",
    matched,
    strength: topCount >= 10 && matched ? "indicative" : matched ? "supporting" : "weak",
    weight: matched ? 40 : 0,
    summary: matched
      ? t.summaryMatched(topCount, amounts.length, topAmount)
      : t.summaryNone,
    evidence: matched
      ? [
          derived(
            t.evRepeatedSize,
            t.evRepeatedSizeDetail(topCount, topAmount, input.chain.toUpperCase(), pct(share)),
          ),
        ]
      : [],
    counterIndicators: matched
      ? [t.counterRecurring, t.counterNoThreshold]
      : [],
  };
}

function dormantThenBurst(input: TypologyInput): TypologyFinding {
  const t = input.copy.typology.dormant;
  const times = input.transactions
    .map((tx) => (tx.timestamp ? new Date(tx.timestamp).getTime() : null))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (times.length < 6) {
    return emptyFinding(
      "dormant-then-burst",
      t.title,
      t.family,
      "unclear",
      t.summaryTooFew,
    );
  }

  let gapIndex = -1;
  let gapDays = 0;
  for (let i = 1; i < times.length; i++) {
    const gap = (times[i] - times[i - 1]) / DAY_MS;
    if (gap > gapDays) {
      gapDays = gap;
      gapIndex = i;
    }
  }

  const after = times.slice(gapIndex);
  const burstCount = after.filter((t) => t - times[gapIndex] <= 7 * DAY_MS).length;
  const matched = gapDays >= 180 && burstCount >= 5;

  return {
    id: "dormant-then-burst",
    title: t.title,
    family: t.family,
    stage: "unclear",
    matched,
    strength: matched && gapDays >= 365 ? "indicative" : matched ? "supporting" : "weak",
    weight: matched ? 35 : 0,
    summary: matched
      ? t.summaryMatched(Math.round(gapDays), burstCount)
      : t.summaryNone,
    evidence: matched
      ? [
          observed(
            t.evDormant,
            t.evDormantDetail(
              formatDate(new Date(times[gapIndex - 1]).toISOString(), false, input.locale),
              formatDate(new Date(times[gapIndex]).toISOString(), false, input.locale),
              Math.round(gapDays),
            ),
          ),
          derived(t.evWaking, t.evWakingDetail(burstCount)),
        ]
      : [],
    counterIndicators: matched
      ? [t.counterHolders, t.counterWindow]
      : [],
  };
}

function roundTripping(input: TypologyInput): TypologyFinding {
  const t = input.copy.typology.roundTripping;
  const matched = input.returnPaths.length > 0;
  return {
    id: "round-tripping",
    title: t.title,
    family: t.family,
    stage: "layering",
    matched,
    strength: matched ? "supporting" : "weak",
    weight: matched ? 50 : 0,
    summary: matched ? t.summaryMatched(input.returnPaths.length) : t.summaryNone,
    evidence: input.returnPaths
      .slice(0, 4)
      .map((path) => derived(t.evReturnPath, t.evReturnPathDetail(path.via, path.back))),
    counterIndicators: matched
      ? [t.counterWalletOps, t.counterLimited]
      : [],
  };
}

/** Not a suspicion finding. Value reaching a custodian or bridge leaves the
 *  transparent graph, and a report should say where tracing stopped rather than
 *  implying the trail simply ended. */
function offGraphContinuation(input: TypologyInput): TypologyFinding {
  const t = input.copy.typology.offGraph;
  const exits = input.neighbors.filter(
    (row) =>
      row.direction === "out" &&
      row.node.tags.some((tag) => ["exchange", "bridge", "wallet-service"].includes(tag.category)),
  );
  const exitValue = exits.reduce((sum, row) => sum + BigInt(row.link.value.raw), 0n);
  const totalOut = input.neighbors
    .filter((row) => row.direction === "out")
    .reduce((sum, row) => sum + BigInt(row.link.value.raw), 0n);
  const share = totalOut > 0n ? Number((exitValue * 10_000n) / totalOut) / 10_000 : 0;
  const matched = exits.length > 0 && share >= 0.2;

  return {
    id: "off-graph-continuation",
    title: t.title,
    family: t.family,
    stage: "integration",
    matched,
    strength: "supporting",
    weight: 0,
    summary: matched ? t.summaryMatched(pct(share)) : t.summaryNone,
    evidence: exits.slice(0, 5).map((row) =>
      attribution(
        t.evExit(row.node.label ?? t.fallbackLabel),
        t.evExitDetail(formatCoin(row.link.value, input.chain), row.link.txCount),
      ),
    ),
    counterIndicators: matched
      ? [t.counterNotRedFlag, t.counterRequest]
      : [],
  };
}

function emptyFinding(
  id: TypologyId,
  title: string,
  family: string,
  stage: TypologyFinding["stage"],
  summary: string,
): TypologyFinding {
  return {
    id,
    title,
    family,
    stage,
    matched: false,
    strength: "weak",
    weight: 0,
    summary,
    evidence: [],
    counterIndicators: [],
  };
}

/* ------------------------------------------------------------------- run */

export function detectTypologies(input: TypologyInput): TypologyFinding[] {
  const findings = [
    sanctionsExposure(input),
    mixerExposure(input),
    peelChain(input),
    rapidPassThrough(input),
    funnelAggregation(input),
    dispersalFanOut(input),
    uniformAmountLayering(input),
    dormantThenBurst(input),
    roundTripping(input),
    offGraphContinuation(input),
  ];

  // Structural typologies describe the shape of a service as accurately as they
  // describe a mule. Where the subject is an attributed service, the structural
  // findings are kept visible but stripped of weight and told why, rather than
  // being deleted - an analyst still needs to see what the structure looks like.
  if (input.subjectIsKnownService) {
    const structural: TypologyId[] = [
      "rapid-pass-through",
      "funnel-aggregation",
      "dispersal-fan-out",
      "uniform-amount-layering",
      "peel-chain",
    ];
    for (const finding of findings) {
      if (!structural.includes(finding.id) || !finding.matched) continue;
      finding.weight = 0;
      finding.strength = "weak";
      finding.counterIndicators = [
        input.copy.typology.serviceDeweighted,
        ...finding.counterIndicators,
      ];
    }
  }

  return findings.sort((a, b) => {
    if (a.matched !== b.matched) return a.matched ? -1 : 1;
    return b.weight - a.weight;
  });
}

export { SERVICE_CATEGORIES };
