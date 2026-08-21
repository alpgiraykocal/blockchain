import type { NeighborRow } from "../analysis";
import { formatCoin, formatDate, formatNumber } from "../format";
import type { AddressSummary, ChainId, Tag, Transaction } from "../types";
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
  const direct = input.address.tags.filter((tag) => tag.abuse === "sanctions");
  const exposed = input.neighbors.filter((row) =>
    row.node.tags.some((tag) => tag.abuse === "sanctions"),
  );

  const evidence: Evidence[] = [];
  for (const tag of direct) {
    evidence.push(attribution("Subject is listed", `${tag.label}. ${tag.notes ?? ""}`.trim()));
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
    const amount = `${formatCoin(row.link.value, input.chain)} across ${row.link.txCount} transaction(s)`;
    evidence.push(
      attribution(
        row.direction === "out"
          ? `Subject sent value to a listed party: ${tag.label}`
          : `Subject received value from a listed party: ${tag.label}`,
        row.direction === "out"
          ? `${amount} sent by the subject to that address.`
          : `${amount} received by the subject from that address.`,
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
    title: "Sanctions exposure",
    family: "Prohibited counterparty",
    stage: "unclear",
    matched,
    strength: direct.length || outbound.length ? "indicative" : matched ? "supporting" : "weak",
    weight,
    summary: direct.length
      ? "The subject address itself appears on an OFAC sanctions list. This is a list match on a published identifier, not a behavioural inference."
      : outbound.length
        ? `The subject sent value to ${outbound.length} address(es) on an OFAC sanctions list. Value moving to a listed party is a potential prohibited transaction and is treated as the more serious direction.`
        : inbound.length
          ? inboundOnlyDust
            ? `The subject received a negligible amount from ${inbound.length} listed address(es). Amounts this small are characteristic of dusting, where a listed address sprays tiny sums at unrelated recipients, and the subject may have had no part in it.`
            : `The subject received value from ${inbound.length} address(es) on an OFAC sanctions list.`
          : "No direct or one-hop match against the loaded OFAC snapshot.",
    evidence,
    counterIndicators: matched
      ? [
          ...(inbound.length && !outbound.length && !direct.length
            ? [
                "Inbound value cannot be refused on a public blockchain. Receiving from a listed address is not itself an act by the subject.",
                ...(inboundOnlyDust
                  ? [
                      "The amount received is negligible, which is the signature of a dusting campaign rather than a funds transfer.",
                    ]
                  : []),
              ]
            : []),
          "A list match is an identifier match on a published address. It does not by itself establish the subject's knowledge or intent.",
          "Sanctions screening covers published addresses only. It cannot see addresses a designated party controls but has never had published, nor entities blocked derivatively under the 50 Percent Rule.",
        ]
      : [
          "A clear screening result is not a clearance: the snapshot covers published addresses only, and is only as current as its last sync.",
        ],
  };
}

function mixerExposure(input: TypologyInput): TypologyFinding {
  const isMixer = taggedAs(
    input.address.tags,
    (tag) => tag.category === "mixer" || tag.abuse === "mixer",
  );
  const counterparties = input.neighbors.filter((row) =>
    row.node.tags.some((tag) => tag.category === "mixer" || tag.abuse === "mixer"),
  );

  const evidence: Evidence[] = [];
  if (isMixer) {
    evidence.push(attribution("Subject is a mixing service", isMixer.label));
  }
  for (const row of counterparties.slice(0, 5)) {
    evidence.push(
      attribution(
        `${row.direction === "in" ? "Received from" : "Sent to"} ${row.node.label ?? "a mixing service"}`,
        `${formatCoin(row.link.value, input.chain)} across ${row.link.txCount} transaction(s).`,
      ),
    );
  }

  const matched = Boolean(isMixer) || counterparties.length > 0;
  return {
    id: "mixer-exposure",
    title: "Mixing or privacy-service exposure",
    family: "On-chain layering",
    stage: "layering",
    matched,
    strength: matched ? "indicative" : "weak",
    weight: matched ? (isMixer ? 70 : 65) : 0,
    summary: matched
      ? "Value moved to or from a service whose function is to break the link between source and destination, which is the defining step of on-chain layering."
      : "No counterparty in the analysed window is tagged as a mixing or privacy service.",
    evidence,
    counterIndicators: matched
      ? [
          "Privacy tooling has lawful uses, and using one is not itself an offence in most jurisdictions.",
          "Mixer attribution comes from third-party research, not from a legal designation, unless the sanctions finding also fired.",
        ]
      : [],
  };
}

/** A peel chain spends a large balance repeatedly, sending a small slice onward
 *  each time and forwarding the remainder to a fresh change address. In the tx
 *  structure it shows as a run of two-output spends where one output holds most
 *  of the value. */
function peelChain(input: TypologyInput): TypologyFinding {
  if (input.chain !== "btc") {
    return {
      id: "peel-chain",
      title: "Peel chain",
      family: "On-chain layering",
      stage: "layering",
      matched: false,
      strength: "weak",
      weight: 0,
      summary:
        "Peel-chain detection reads UTXO change structure and does not apply to an account-model chain.",
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
    title: "Peel chain",
    family: "On-chain layering",
    stage: "layering",
    matched,
    strength: peels.length >= 6 ? "indicative" : matched ? "supporting" : "weak",
    weight: matched ? Math.min(60, 25 + peels.length * 4) : 0,
    summary: matched
      ? `${peels.length} outbound transactions in the window split into two outputs with one holding at least 80% of the value, the structure a peel chain produces.`
      : "No repeated two-output spend pattern consistent with peeling in the analysed window.",
    evidence: matched
      ? [
          derived(
            "Repeated asymmetric two-output spends",
            `${peels.length} of ${input.transactions.length} analysed transactions.`,
          ),
          observed(
            "Example",
            `${peels[0].hash} on ${formatDate(peels[0].timestamp, false)}.`,
          ),
        ]
      : [],
    counterIndicators: matched
      ? [
          "Ordinary wallet spending produces the same two-output shape whenever a payment is smaller than the input being spent; change output structure alone does not distinguish the two.",
          "Wallets that batch payments or use fixed change policies can generate this pattern continuously without any layering intent.",
        ]
      : [],
  };
}

function rapidPassThrough(input: TypologyInput): TypologyFinding {
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
        "Almost nothing retained",
        `${pct(metrics.passThroughRatio, 1)} of everything received was sent on; the balance now stands at ${formatCoin(
          input.address.balance,
          input.chain,
        )}.`,
      ),
      derived(
        "Short dwell time",
        `Median ${dwell!.toFixed(1)} hours between an inbound transaction and the next outbound one.`,
      ),
      observed("Turnover", `${formatNumber(input.address.txCount)} transactions on the address.`),
    );
  }

  return {
    id: "rapid-pass-through",
    title: "Rapid pass-through",
    family: "Mule / conduit behaviour",
    stage: "layering",
    matched,
    strength: matched && dwell !== null && dwell <= 6 ? "indicative" : matched ? "supporting" : "weak",
    weight: matched ? 55 : 0,
    summary: matched
      ? "Funds arrive and leave again almost immediately with little retained, which is how a conduit or mule address behaves."
      : "Retention and timing do not fit a pass-through conduit in the analysed window.",
    evidence,
    counterIndicators: matched
      ? [
          "Custodial sweep wallets, payment processors and consolidation addresses are designed to behave exactly this way.",
          "Dwell time is measured over the analysed window only; a longer history could show retention this slice cannot see.",
        ]
      : [],
  };
}

function funnelAggregation(input: TypologyInput): TypologyFinding {
  const { metrics } = input;
  const matched =
    metrics.inDegree >= 10 && metrics.inDegree >= Math.max(5, metrics.outDegree * 5);

  return {
    id: "funnel-aggregation",
    title: "Funnel aggregation",
    family: "Mule / collection network",
    stage: "placement",
    matched,
    strength: metrics.inDegree >= 25 && matched ? "indicative" : matched ? "supporting" : "weak",
    weight: matched ? 45 : 0,
    summary: matched
      ? `${metrics.inDegree} distinct senders converge on this address against ${metrics.outDegree} receiver(s), the shape of a collection point.`
      : "Counterparty structure does not converge in the analysed window.",
    evidence: matched
      ? [
          derived(
            "Convergent counterparty structure",
            `Fan-in ratio ${pct(metrics.fanInRatio)} across ${metrics.degree} counterparties.`,
          ),
          derived(
            "Non-repeating senders",
            `${pct(metrics.oneShotRatio)} of counterparties appear exactly once.`,
          ),
        ]
      : [],
    counterIndicators: matched
      ? [
          "Merchant settlement, donation addresses, mining payouts and exchange deposit addresses all converge by design.",
          "Convergence is only meaningful against a customer profile; without one, it describes structure rather than intent.",
        ]
      : [],
  };
}

function dispersalFanOut(input: TypologyInput): TypologyFinding {
  const { metrics } = input;
  const matched =
    metrics.outDegree >= 10 && metrics.outDegree >= Math.max(5, metrics.inDegree * 5);

  return {
    id: "dispersal-fan-out",
    title: "Dispersal",
    family: "Layering",
    stage: "layering",
    matched,
    strength: metrics.outDegree >= 25 && matched ? "indicative" : matched ? "supporting" : "weak",
    weight: matched ? 45 : 0,
    summary: matched
      ? `Value leaves to ${metrics.outDegree} distinct receivers against ${metrics.inDegree} sender(s), consistent with breaking a sum into many smaller onward transfers.`
      : "Counterparty structure does not disperse in the analysed window.",
    evidence: matched
      ? [
          derived(
            "Divergent counterparty structure",
            `Fan-out ratio ${pct(metrics.fanOutRatio)} across ${metrics.degree} counterparties.`,
          ),
        ]
      : [],
    counterIndicators: matched
      ? [
          "Payroll, airdrops, mining pool payouts and exchange withdrawal wallets disperse by design.",
        ]
      : [],
  };
}

/** Repeated near-identical amounts are a layering fingerprint: value split into
 *  uniform slices to move it without any single transfer standing out. */
function uniformAmountLayering(input: TypologyInput): TypologyFinding {
  const amounts = input.transactions
    .map((tx) => Math.abs(tx.netForAddress?.coin ?? 0))
    .filter((value) => value > 0);

  if (amounts.length < 5) {
    return emptyFinding(
      "uniform-amount-layering",
      "Uniform-amount layering",
      "Layering",
      "layering",
      "Too few valued transactions in the window to test for repeated amounts.",
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
    title: "Uniform-amount layering",
    family: "Layering",
    stage: "layering",
    matched,
    strength: topCount >= 10 && matched ? "indicative" : matched ? "supporting" : "weak",
    weight: matched ? 40 : 0,
    summary: matched
      ? `${topCount} of ${amounts.length} valued transactions move approximately the same amount (${topAmount}), consistent with splitting a sum into uniform slices.`
      : "No dominant repeated transaction amount in the analysed window.",
    evidence: matched
      ? [
          derived(
            "Repeated transfer size",
            `${topCount} transactions at approximately ${topAmount} ${input.chain.toUpperCase()}, ${pct(share)} of valued transactions in the window.`,
          ),
        ]
      : [],
    counterIndicators: matched
      ? [
          "Subscription payments, fixed-price sales, mining payouts and automated rebalancing all produce repeated identical amounts.",
          "On-chain transfers face no reporting threshold to structure around; uniformity here is a layering signal, not threshold avoidance.",
        ]
      : [],
  };
}

function dormantThenBurst(input: TypologyInput): TypologyFinding {
  const times = input.transactions
    .map((tx) => (tx.timestamp ? new Date(tx.timestamp).getTime() : null))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (times.length < 6) {
    return emptyFinding(
      "dormant-then-burst",
      "Dormancy then burst",
      "Behavioural change",
      "unclear",
      "Too few timestamped transactions in the window to test for a dormancy break.",
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
    title: "Dormancy then burst",
    family: "Behavioural change",
    stage: "unclear",
    matched,
    strength: matched && gapDays >= 365 ? "indicative" : matched ? "supporting" : "weak",
    weight: matched ? 35 : 0,
    summary: matched
      ? `The address was inactive for ${Math.round(gapDays)} days, then produced ${burstCount} transactions within a week of waking.`
      : "No long dormancy followed by concentrated activity in the analysed window.",
    evidence: matched
      ? [
          observed(
            "Dormant period",
            `${formatDate(new Date(times[gapIndex - 1]).toISOString(), false)} to ${formatDate(
              new Date(times[gapIndex]).toISOString(),
              false,
            )}, ${Math.round(gapDays)} days.`,
          ),
          derived("Activity on waking", `${burstCount} transactions within seven days.`),
        ]
      : [],
    counterIndicators: matched
      ? [
          "Long-term holders moving a position, recovered wallets and estate transfers all look like this.",
          "The window may simply begin part-way through a longer pattern.",
        ]
      : [],
  };
}

function roundTripping(input: TypologyInput): TypologyFinding {
  const matched = input.returnPaths.length > 0;
  return {
    id: "round-tripping",
    title: "Round-tripping",
    family: "Layering",
    stage: "layering",
    matched,
    strength: matched ? "supporting" : "weak",
    weight: matched ? 50 : 0,
    summary: matched
      ? `Value routed out through ${input.returnPaths.length} counterparty path(s) that lead back to the subject's own cluster, adding hops without changing beneficial control.`
      : "No path in the extracted network returns to the subject's cluster.",
    evidence: input.returnPaths.slice(0, 4).map((path) =>
      derived("Return path", `Out via ${path.via}, back to cluster member ${path.back}.`),
    ),
    counterIndicators: matched
      ? [
          "Wallet management, consolidation and exchange deposit-withdrawal cycles produce loops without any layering purpose.",
          "Detection is limited to the extracted network; a loop through an unexpanded node will not appear.",
        ]
      : [],
  };
}

/** Not a suspicion finding. Value reaching a custodian or bridge leaves the
 *  transparent graph, and a report should say where tracing stopped rather than
 *  implying the trail simply ended. */
function offGraphContinuation(input: TypologyInput): TypologyFinding {
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
    title: "Tracing continues off-graph",
    family: "Investigation limit",
    stage: "integration",
    matched,
    strength: "supporting",
    weight: 0,
    summary: matched
      ? `${pct(share)} of observed outflow reaches a custodian or bridge, where on-chain tracing stops and only the receiving institution can continue it.`
      : "No material share of outflow reaches a tagged custodian or bridge in the analysed window.",
    evidence: exits.slice(0, 5).map((row) =>
      attribution(
        `Exit point: ${row.node.label ?? "custodial service"}`,
        `${formatCoin(row.link.value, input.chain)} across ${row.link.txCount} transaction(s).`,
      ),
    ),
    counterIndicators: matched
      ? [
          "This is a limit of the data, not a red flag. Reaching an exchange is ordinary and expected.",
          "Continuing past this point requires a request to the receiving institution, not further on-chain analysis.",
        ]
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
        "The subject is an attributed service, where this structure is the expected operating shape rather than an anomaly.",
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
