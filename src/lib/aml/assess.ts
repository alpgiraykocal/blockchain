import { createHash } from "node:crypto";
import { CHAINS } from "../chains/registry";
import { OFAC_SNAPSHOT, isSnapshotStale, snapshotIssuedAt } from "../tags/ofac";
import { labelSnapshot } from "../tags/actors";
import type { ChainId } from "../types";
import { decideDisposition } from "./disposition";
import { ENGINE_VERSION, LAYOUT_VERSION, extractEgoNetwork, type ExtractOptions } from "./ego-network";
import { buildNarrative } from "./narrative";
import { detectTypologies } from "./typologies";
import type { AmlAssessment, AuditRecord, EgoNetwork } from "./types";

/**
 * Assessment orchestration: extract the local network, measure it, test it
 * against the typology set, recommend a disposition and draft the case file.
 *
 * The audit record binds the conclusion to the exact data state that produced
 * it - explorer, sanctions publication, label snapshot revision, filters and
 * window - so the same assessment can be reproduced or challenged later.
 */

const SERVICE_CATEGORIES = new Set([
  "exchange",
  "mining-pool",
  "token",
  "defi",
  "bridge",
  "wallet-service",
]);

function buildAudit(
  chain: ChainId,
  address: string,
  entityId: string | null,
  network: EgoNetwork,
  analyst: string | null,
): AuditRecord {
  const labels = labelSnapshot();
  const generatedAt = new Date().toISOString();

  // Deterministic id over the inputs that define the assessment, so the same
  // question asked the same way is traceable to the same reference.
  const assessmentId = createHash("sha256")
    .update(
      [
        chain,
        address,
        JSON.stringify(network.filters),
        JSON.stringify(network.window),
        OFAC_SNAPSHOT.retrievedAt,
        labels.generatedAt,
        generatedAt,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);

  return {
    assessmentId,
    generatedAt,
    subject: { chain, address, entityId },
    layoutVersion: LAYOUT_VERSION,
    engineVersion: ENGINE_VERSION,
    filters: network.filters,
    window: network.window,
    reductionApplied: network.reduction.map(
      (step) => `${step.rule}${step.removed ? ` (-${step.removed})` : ""}`,
    ),
    dataSources: {
      explorer: CHAINS[chain].explorerName,
      sanctionsList: OFAC_SNAPSHOT.source,
      sanctionsIssued: snapshotIssuedAt(),
      sanctionsRetrieved: OFAC_SNAPSHOT.retrievedAt,
      labelSnapshot: labels.generatedAt,
      labelSources: labels.sources.map((source) => ({
        id: source.id,
        version: source.version,
      })),
    },
    analyst,
  };
}

export interface AssessOptions extends ExtractOptions {
  analyst?: string | null;
}

export async function assessAddress(
  chain: ChainId,
  address: string,
  options: AssessOptions = {},
): Promise<{ assessment: AmlAssessment; network: EgoNetwork }> {
  const { network, analysis, returnPaths } = await extractEgoNetwork(chain, address, options);

  const subjectIsKnownService = analysis.address.tags.some(
    (tag) => tag.abuse === "none" && tag.confidence >= 0.7 && SERVICE_CATEGORIES.has(tag.category),
  );
  const windowComplete = analysis.window.txsAnalysed >= analysis.window.txsTotal;

  const findings = detectTypologies({
    chain,
    address: analysis.address,
    transactions: analysis.transactions,
    neighbors: analysis.neighbors,
    metrics: network.metrics,
    returnPaths,
    subjectIsKnownService,
    windowComplete,
  });

  const disposition = decideDisposition({
    chain,
    address: analysis.address,
    metrics: network.metrics,
    findings,
    subjectIsKnownService,
    sanctionsSnapshotStale: isSnapshotStale(),
    windowComplete,
  });

  const narrative = buildNarrative({
    chain,
    address: analysis.address,
    entityAddressCount: analysis.entity.addressCount,
    transactions: analysis.transactions,
    metrics: network.metrics,
    findings,
    disposition,
    windowSize: analysis.window.txsAnalysed,
    windowTotal: analysis.window.txsTotal,
  });

  const limitations: string[] = [
    `Counterparties and timing derive from ${analysis.window.txsAnalysed} of ${analysis.window.txsTotal} transactions supplied by ${CHAINS[chain].explorerName}. A pattern outside that window cannot fire a detector.`,
  ];
  if (analysis.window.clusterPartial) {
    limitations.push(
      "Co-spend clustering sees only the transactions in the window, so the entity may be larger on the full chain.",
    );
  }
  if (analysis.window.totalsWindowed) {
    limitations.push(
      "Received and sent totals are computed over the window rather than full history on this chain.",
    );
  }
  if (analysis.window.txsUnavailable) {
    limitations.push(
      `The explorer could not serve the transaction list (${analysis.window.txsUnavailable}); behavioural detectors had no data to run against.`,
    );
  }
  if (isSnapshotStale()) {
    limitations.push(
      "The sanctions snapshot is older than the seven-day review threshold; a recent designation may be missing.",
    );
  }
  if (network.incomplete.length) {
    limitations.push(
      `${network.incomplete.length} second-hop expansion(s) failed and are absent from the network.`,
    );
  }
  limitations.push(
    "No customer information is in scope. Every structural finding describes shape only and becomes meaningful only against a stated business profile.",
  );

  return {
    assessment: {
      subject: {
        chain,
        address: analysis.address.address,
        label: analysis.entity.label,
        entityId: analysis.address.entityId,
        entityAddressCount: analysis.entity.addressCount,
        balance: analysis.address.balance,
        totalReceived: analysis.address.totalReceived,
        totalSent: analysis.address.totalSent,
        txCount: analysis.address.txCount,
        isContract: analysis.address.isContract,
        tags: analysis.address.tags,
      },
      metrics: network.metrics,
      findings,
      disposition,
      narrative,
      audit: buildAudit(
        chain,
        analysis.address.address,
        analysis.address.entityId,
        network,
        options.analyst ?? null,
      ),
      dataHealth: {
        txsAnalysed: analysis.window.txsAnalysed,
        txsTotal: analysis.window.txsTotal,
        txsUnavailable: analysis.window.txsUnavailable,
        clusterPartial: analysis.window.clusterPartial,
        totalsWindowed: analysis.window.totalsWindowed,
      },
      limitations,
    },
    network,
  };
}
