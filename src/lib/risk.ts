import type { AmlCopy } from "./aml/copy";
import type {
  AbuseType,
  NodeKind,
  RiskAssessment,
  RiskLevel,
  RiskSignal,
  Tag,
} from "./types";

/**
 * Weight of a direct attribution, 0..100. Sanctions are absolute — a match is a
 * compliance stop, so it saturates the score on its own.
 *
 * Only `sanctions` is reachable from the attribution currently loaded: OFAC is
 * the one source that sets an abuse value, and every other feed — 428k actor
 * labels, the curated packs, explorer metadata — writes `none`. The rest of this
 * table is therefore inert today.
 *
 * It stays complete anyway. The taxonomy is the contract a new feed would be
 * mapped onto, and a partial table would silently score an imported ransomware
 * or theft tag at zero, which is a worse failure than an unused row. Where a
 * behaviour needs to be caught without an abuse tag behind it, the detectors do
 * it structurally — mixer exposure keys on the category, because that is what
 * the feeds actually populate.
 */
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
  /** Copy for the active locale. Signal labels and details are read by a person
   *  and quoted in the case file, so they follow the interface language. */
  copy: AmlCopy;
}

export function levelFor(score: number): RiskLevel {
  if (score >= 90) return "severe";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  if (score >= 15) return "low";
  return "clear";
}

export function assessRisk(input: RiskInput): RiskAssessment {
  const t = input.copy.risk;
  const signals: RiskSignal[] = [];
  let score = 0;
  let maxHops = 0;

  for (const tag of input.ownTags) {
    const weight = ABUSE_WEIGHT[tag.abuse] * tag.confidence;
    if (weight <= 0) continue;
    signals.push({
      code: `direct:${tag.abuse}`,
      label: t.directLabel(t.abuse[tag.abuse]),
      weight: Math.round(weight),
      // Carry the tag's provenance into the signal: for a sanctions hit that is
      // the list, party type, programme and designation date an analyst needs to
      // act on, not just a label.
      detail: tag.notes
        ? t.directDetailNotes(tag.label, tag.pack, tag.notes)
        : t.directDetail(tag.label, tag.pack, Math.round(tag.confidence * 100)),
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
        label: t.indirectLabel(neighbor.hops, t.abuse[tag.abuse]),
        weight: Math.round(weighted),
        detail: t.indirectDetail(tag.label, Math.round(neighbor.shareOfValue * 100)),
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
      label: t.fanOutLabel,
      weight: 18,
      detail: t.fanOutDetail(input.outDegree, input.inDegree),
    });
    score = Math.max(score, 30);
  }
  if (!isKnownService && input.inDegree >= 25 && input.outDegree <= 3) {
    signals.push({
      code: "structure:fan-in",
      label: t.fanInLabel,
      weight: 18,
      detail: t.fanInDetail(input.inDegree, input.outDegree),
    });
    score = Math.max(score, 30);
  }
  if (!isKnownService && input.oneShotRatio != null && input.oneShotRatio > 0.9 && degree >= 20) {
    signals.push({
      code: "structure:one-shot",
      label: t.oneShotLabel,
      weight: 12,
      detail: t.oneShotDetail(Math.round(input.oneShotRatio * 100)),
    });
    score = Math.max(score, 25);
  }

  if (!signals.length) {
    signals.push({
      code: "clear",
      label: isKnownService ? t.knownServiceLabel : t.noSignalLabel,
      weight: 0,
      detail: isKnownService ? t.knownServiceDetail : t.noSignalDetail,
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
