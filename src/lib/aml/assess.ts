import { createHash } from "node:crypto";
import { CHAINS } from "../chains/registry";
import { OFAC_SNAPSHOT, isSnapshotStale, snapshotIssuedAt } from "../tags/ofac";
import { labelSnapshot } from "../tags/actors";
import type { AssetId, ChainId } from "../types";
import type { AmlCopy } from "./copy";
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
  asset: AssetId,
  address: string,
  entityId: string | null,
  network: EgoNetwork,
  analyst: string | null,
): AuditRecord {
  const labels = labelSnapshot();
  const generatedAt = new Date().toISOString();

  // Deterministic id over the inputs that define the assessment, so the same
  // question asked the same way is traceable to the same reference. The wall
  // clock is deliberately not one of them: including `generatedAt` gave every
  // repeat of an identical query a fresh id, which is the opposite of what an
  // audit trail needs. When the id has to change, it is because a filter, the
  // window or a data snapshot changed - and each of those is hashed here.
  const assessmentId = createHash("sha256")
    .update(
      [
        chain,
        address,
        asset,
        JSON.stringify(network.filters),
        JSON.stringify(network.window),
        OFAC_SNAPSHOT.retrievedAt,
        labels.generatedAt,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);

  return {
    assessmentId,
    generatedAt,
    subject: { chain, asset, address, entityId },
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
  /** Asset to analyse; the chain's native coin by default. */
  analyst?: string | null;
  /** Copy for the language the assessment is written in. */
  copy: AmlCopy;
  /** Locale tag for embedded dates. */
  locale: string;
}

export async function assessAddress(
  chain: ChainId,
  address: string,
  options: AssessOptions,
): Promise<{ assessment: AmlAssessment; network: EgoNetwork }> {
  const { copy, locale } = options;
  const asset: AssetId = options.asset ?? chain;
  const { network, analysis, returnPaths } = await extractEgoNetwork(chain, address, {
    ...options,
    copy,
    asset,
  });

  const subjectIsKnownService = analysis.address.tags.some(
    (tag) => tag.abuse === "none" && tag.confidence >= 0.7 && SERVICE_CATEGORIES.has(tag.category),
  );
  const windowComplete = analysis.window.txsAnalysed >= analysis.window.txsTotal;

  const findings = detectTypologies({
    chain,
    asset,
    impersonators: analysis.impersonators,
    address: analysis.address,
    transactions: analysis.transactions,
    neighbors: analysis.neighbors,
    metrics: network.metrics,
    returnPaths,
    subjectIsKnownService,
    windowComplete,
    copy,
    locale,
  });

  const disposition = decideDisposition({
    chain,
    asset,
    address: analysis.address,
    metrics: network.metrics,
    findings,
    subjectIsKnownService,
    sanctionsSnapshotStale: isSnapshotStale(),
    windowComplete,
    copy,
  });

  const narrative = buildNarrative({
    chain,
    asset,
    address: analysis.address,
    entityAddressCount: analysis.entity.addressCount,
    transactions: analysis.transactions,
    metrics: network.metrics,
    findings,
    disposition,
    windowSize: analysis.window.txsAnalysed,
    windowTotal: analysis.window.txsTotal,
    copy,
    locale,
  });

  const lim = copy.limitations;
  const limitations: string[] = [
    lim.window(
      analysis.window.txsAnalysed,
      analysis.window.txsTotal,
      CHAINS[chain].explorerName,
    ),
  ];
  if (analysis.window.clusterPartial) {
    limitations.push(lim.clusterPartial);
  }
  if (analysis.window.totalsWindowed) {
    limitations.push(lim.totalsWindowed);
  }
  if (analysis.window.txsUnavailable) {
    limitations.push(lim.txsUnavailable(analysis.window.txsUnavailable));
  }
  if (isSnapshotStale()) {
    limitations.push(lim.snapshotStale);
  }
  if (network.incomplete.length) {
    limitations.push(lim.expansionsFailed(network.incomplete.length));
  }
  limitations.push(lim.noCustomerInfo);

  return {
    assessment: {
      subject: {
        chain,
        asset,
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
        asset,
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
