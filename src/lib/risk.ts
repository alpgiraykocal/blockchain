import type {
  AbuseType,
  NodeKind,
  RiskAssessment,
  RiskLevel,
  RiskSignal,
  Tag,
} from "./types";

/** Weight of a direct attribution, 0..100. Sanctions are absolute — a match is a
 *  compliance stop, so it saturates the score on its own. */
const ABUSE_WEIGHT: Record<AbuseType, number> = {
  sanctions: 100,
  "terrorism-financing": 100,
  ransomware: 92,
  theft: 84,
  "darknet-market": 80,
  mixer: 72,
  scam: 68,
  none: 0,
};

const ABUSE_LABEL: Record<AbuseType, string> = {
  sanctions: "Sanctioned party",
  "terrorism-financing": "Terrorism financing",
  ransomware: "Ransomware",
  theft: "Theft / hack proceeds",
  "darknet-market": "Darknet market",
  mixer: "Mixing service",
  scam: "Scam / fraud",
  none: "No abuse category",
};

/** How much of a neighbour's risk carries across one hop of exposure. */
const HOP_DECAY = 0.55;

export interface RiskInput {
  ownTags: Tag[];
  /** Tags observed on direct counterparties, with the hop distance they sit at. */
  neighborTags: { tags: Tag[]; hops: number; shareOfValue: number }[];
  txCount: number;
  inDegree: number;
  outDegree: number;
  /** Fraction of counterparties that appear exactly once — a peel-chain fingerprint. */
  oneShotRatio?: number;
}

export function levelFor(score: number): RiskLevel {
  if (score >= 90) return "severe";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  if (score >= 15) return "low";
  return "clear";
}

export function assessRisk(input: RiskInput): RiskAssessment {
  const signals: RiskSignal[] = [];
  let score = 0;
  let maxHops = 0;

  for (const tag of input.ownTags) {
    const weight = ABUSE_WEIGHT[tag.abuse] * tag.confidence;
    if (weight <= 0) continue;
    signals.push({
      code: `direct:${tag.abuse}`,
      label: `Direct: ${ABUSE_LABEL[tag.abuse]}`,
      weight: Math.round(weight),
      // Carry the tag's provenance into the signal: for a sanctions hit that is
      // the list, party type, programme and designation date an analyst needs to
      // act on, not just a label.
      detail: tag.notes
        ? `Tagged "${tag.label}" by ${tag.pack}. ${tag.notes}`
        : `Tagged "${tag.label}" by ${tag.pack} (confidence ${Math.round(
            tag.confidence * 100,
          )}%).`,
    });
    score = Math.max(score, weight);
  }

  for (const neighbor of input.neighborTags) {
    for (const tag of neighbor.tags) {
      const base = ABUSE_WEIGHT[tag.abuse] * tag.confidence;
      if (base <= 0) continue;
      const decayed = base * HOP_DECAY ** Math.max(1, neighbor.hops);
      // Exposure scales with how much value actually moved to that counterparty.
      const weighted = decayed * (0.35 + 0.65 * clamp01(neighbor.shareOfValue));
      maxHops = Math.max(maxHops, neighbor.hops);
      signals.push({
        code: `indirect:${tag.abuse}`,
        label: `${neighbor.hops}-hop exposure: ${ABUSE_LABEL[tag.abuse]}`,
        weight: Math.round(weighted),
        detail: `Counterparty tagged "${tag.label}" holds ${Math.round(
          neighbor.shareOfValue * 100,
        )}% of the observed flow.`,
      });
      score = Math.max(score, weighted);
    }
  }

  // Structural heuristics: never decisive on their own, but they lift a clean
  // address into "worth a look" territory. They are suppressed for known
  // services — fan-in and fan-out are the normal shape of an exchange or pool,
  // so firing there would only manufacture false positives.
  const isKnownService = input.ownTags.some(
    (tag) =>
      tag.abuse === "none" &&
      tag.confidence >= 0.7 &&
      // Mixers are deliberately absent: high fan-in and fan-out is the whole
      // point of one, so structure stays informative there.
      [
        "exchange",
        "mining-pool",
        "defi",
        "bridge",
        "wallet-service",
        "gambling",
        "merchant",
        "token",
      ].includes(tag.category),
  );
  const degree = input.inDegree + input.outDegree;
  if (!isKnownService && input.outDegree >= 25 && input.inDegree <= 3) {
    signals.push({
      code: "structure:fan-out",
      label: "Fan-out distribution",
      weight: 18,
      detail: `${input.outDegree} receiving counterparties against ${input.inDegree} senders — consistent with dispersal or peeling.`,
    });
    score = Math.max(score, 30);
  }
  if (!isKnownService && input.inDegree >= 25 && input.outDegree <= 3) {
    signals.push({
      code: "structure:fan-in",
      label: "Fan-in consolidation",
      weight: 18,
      detail: `${input.inDegree} senders funnel into ${input.outDegree} outputs — consistent with collection or mule aggregation.`,
    });
    score = Math.max(score, 30);
  }
  if (!isKnownService && input.oneShotRatio != null && input.oneShotRatio > 0.9 && degree >= 20) {
    signals.push({
      code: "structure:one-shot",
      label: "Non-repeating counterparties",
      weight: 12,
      detail: `${Math.round(input.oneShotRatio * 100)}% of counterparties appear exactly once.`,
    });
    score = Math.max(score, 25);
  }

  if (!signals.length) {
    signals.push({
      code: "clear",
      label: isKnownService
        ? "Known service — structural heuristics suppressed"
        : "No attribution or structural signal",
      weight: 0,
      detail: isKnownService
        ? "Tagged as a known service, where high fan-in and fan-out are expected rather than suspicious."
        : "No tag matched and no structural heuristic fired in the analysed window.",
    });
  }

  const rounded = Math.round(Math.min(100, score));
  return {
    score: rounded,
    level: levelFor(rounded),
    signals: signals.sort((a, b) => b.weight - a.weight),
    hops: maxHops,
  };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

/** Maps attribution to the visual node category used across the graph and tables. */
export function nodeKindFor(tags: Tag[], isEntity: boolean): NodeKind {
  if (tags.some((tag) => tag.abuse === "mixer" || tag.category === "mixer")) return "mixer";
  if (tags.some((tag) => tag.category === "exchange")) return "exchange";
  if (
    tags.some((tag) =>
      ["defi", "bridge", "mining-pool", "gambling", "wallet-service", "merchant", "token"].includes(
        tag.category,
      ),
    )
  ) {
    return "service";
  }
  if (tags.length) return isEntity ? "entity" : "address";
  return isEntity ? "entity" : "unknown";
}

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  clear: "Clear",
  low: "Low",
  medium: "Medium",
  high: "High",
  severe: "Severe",
};
