import type { ChainId, Tag, TagPack } from "../types";
import { BUILTIN_PACKS } from "./builtin";
import {
  actorLabelsFor,
  actorLeaderboard,
  hasLabelSnapshot,
  labelSnapshot,
  labelSnapshotError,
} from "./actors";
import {
  OFAC_SNAPSHOT,
  allOfacTags,
  indexKey,
  isSnapshotStale,
  ofacTagCount,
  ofacTagsFor,
  programBreakdown,
  snapshotAgeDays,
  snapshotIssuedAt,
} from "./ofac";

/** Index over the hand-curated attribution packs. Sanctions tags are served from
 *  the generated OFAC snapshot instead — see `ofac.ts`. */
const INDEX = new Map<string, Tag[]>();

for (const pack of BUILTIN_PACKS) {
  for (const tag of pack.tags) {
    const key = indexKey(tag.chain, tag.subject);
    const bucket = INDEX.get(key);
    if (bucket) bucket.push(tag);
    else INDEX.set(key, [tag]);
  }
}

export function builtinTagsFor(chain: ChainId, subject: string): Tag[] {
  // Sanctions first: a screening hit outranks a descriptive actor label.
  const sanctions = ofacTagsFor(chain, subject);
  const actors = actorLabelsFor(chain, subject);

  // The curated pack is a fallback, not a peer. Once a synced feed knows the
  // address, showing a second hand-written label for the same wallet is noise.
  const curated = actors.length ? [] : (INDEX.get(indexKey(chain, subject)) ?? []);

  return [...sanctions, ...actors, ...curated];
}

export function builtinTagsForMany(
  chain: ChainId,
  subjects: string[],
): Record<string, Tag[]> {
  const result: Record<string, Tag[]> = {};
  for (const subject of subjects) {
    const tags = builtinTagsFor(chain, subject);
    if (tags.length) result[subject] = tags;
  }
  return result;
}

export function allPacks(): TagPack[] {
  return BUILTIN_PACKS;
}

export interface PackSummary {
  id: string;
  title: string;
  creator: string;
  description: string;
  lastmod: string;
  tagCount: number;
  chains: ChainId[];
  abuseCount: number;
  /** Generated packs carry provenance and can go stale; curated ones do not. */
  generated: boolean;
  /** Upstream project page, rendered as a link rather than pasted into prose. */
  homepage?: string;
  stale?: boolean;
  ageDays?: number;
}

export function packStats(): PackSummary[] {
  const curated = BUILTIN_PACKS.map((pack) => ({
    id: pack.id,
    title: pack.title,
    creator: pack.creator,
    description: pack.description,
    lastmod: pack.lastmod,
    tagCount: pack.tags.length,
    chains: [...new Set(pack.tags.map((tag) => tag.chain))],
    abuseCount: pack.tags.filter((tag) => tag.abuse !== "none").length,
    generated: false,
  }));

  const issued = snapshotIssuedAt();
  const screenable = ofacTagCount();
  const labels = labelSnapshot();

  // Chains are counted per source, not globally: the mining-pool feed is
  // Bitcoin-only and used to advertise an ETH badge it has no addresses for.
  const chainsBySource = new Map<number, Set<ChainId>>();
  for (const [chain, bucket] of Object.entries(labels.addresses)) {
    for (const index of Object.values(bucket)) {
      const record = labels.labels[index];
      if (!record) continue;
      const set = chainsBySource.get(record.source) ?? new Set<ChainId>();
      set.add(chain as ChainId);
      chainsBySource.set(record.source, set);
    }
  }

  const openLabelPacks: PackSummary[] = labels.sources.map((source, index) => ({
    id: source.id,
    title: source.title,
    creator: source.attribution,
    description: `Actor attribution rebuilt from the upstream repository at revision ${
      source.version ?? "unknown"
    }.`,
    homepage: source.homepage,
    lastmod: labels.generatedAt.slice(0, 10),
    tagCount: source.addresses,
    chains: [...(chainsBySource.get(index) ?? new Set<ChainId>())].sort(),
    abuseCount: 0,
    generated: true,
  }));

  return [
    {
      id: "ofac-sls",
      title: "OFAC SDN — digital currency addresses",
      creator: "US Treasury, via the OFAC Sanctions List Service",
      description: `Every digital-currency address published on OFAC's sanctions lists, pulled straight from the source files. ${OFAC_SNAPSHOT.counts.total} addresses across ${
        Object.keys(OFAC_SNAPSHOT.counts.byCurrency).length
      } currencies; ${screenable} are on a chain Blockchain Analysis can screen.`,
      lastmod: issued ?? OFAC_SNAPSHOT.retrievedAt.slice(0, 10),
      tagCount: screenable,
      chains: Object.keys(OFAC_SNAPSHOT.counts.byChain) as ChainId[],
      abuseCount: screenable,
      generated: true,
      stale: isSnapshotStale(),
      ageDays: snapshotAgeDays(),
    },
    ...openLabelPacks,
    ...curated,
  ];
}

export {
  actorLeaderboard,
  hasLabelSnapshot,
  labelSnapshot,
  labelSnapshotError,
  BUILTIN_PACKS,
  OFAC_SNAPSHOT,
  allOfacTags,
  isSnapshotStale,
  ofacTagCount,
  programBreakdown,
  snapshotAgeDays,
  snapshotIssuedAt,
};
