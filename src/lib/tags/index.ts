import type { Dictionary } from "../i18n/types";
import type { ChainId, Tag, TagPack } from "../types";
import { BUILTIN_PACKS } from "./builtin";
import {
  type LabelSnapshot,
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

/**
 * Which chains each label source actually covers.
 *
 * Chains are counted per source, not globally: the mining-pool feed is
 * Bitcoin-only and used to advertise an ETH badge it has no addresses for.
 *
 * Deriving this walks every address in the snapshot - 428k of them - so it is
 * memoised. It used to run on each `packStats()` call, which put roughly four
 * seconds of pure recomputation on the dashboard, the tags page and
 * `/api/tags`, on every request. The snapshot is parsed once per process and
 * never mutated, so keying the memo on its identity is enough: a reload
 * produces a new object and recomputes, and nothing else can go stale.
 */
let chainsBySourceMemo: { for: LabelSnapshot; value: Map<number, Set<ChainId>> } | null = null;

function chainsBySourceFor(labels: LabelSnapshot): Map<number, Set<ChainId>> {
  if (chainsBySourceMemo?.for === labels) return chainsBySourceMemo.value;

  const value = new Map<number, Set<ChainId>>();
  for (const [chain, bucket] of Object.entries(labels.addresses)) {
    for (const index of Object.values(bucket)) {
      const record = labels.labels[index];
      if (!record) continue;
      const set = value.get(record.source) ?? new Set<ChainId>();
      set.add(chain as ChainId);
      value.set(record.source, set);
    }
  }

  chainsBySourceMemo = { for: labels, value };
  return value;
}

/**
 * One row per attribution source, for the tags screen and `/api/tags`.
 *
 * `copy` supplies the prose this app writes about its own packs. The names the
 * upstreams publish under - "OFAC SDN", "GraphSense public TagPacks", their
 * licence lines - are passed through untouched in every language, because a
 * translated source name is no longer a citation.
 */
export function packStats(copy: Dictionary["ui"]["packs"]): PackSummary[] {
  const curated = BUILTIN_PACKS.map((pack) => ({
    id: pack.id,
    title: copy.curated[pack.id]?.title ?? pack.title,
    creator: pack.creator,
    description: copy.curated[pack.id]?.description ?? pack.description,
    lastmod: pack.lastmod,
    tagCount: pack.tags.length,
    chains: [...new Set(pack.tags.map((tag) => tag.chain))],
    abuseCount: pack.tags.filter((tag) => tag.abuse !== "none").length,
    generated: false,
  }));

  const issued = snapshotIssuedAt();
  const screenable = ofacTagCount();
  const labels = labelSnapshot();
  const chainsBySource = chainsBySourceFor(labels);

  const openLabelPacks: PackSummary[] = labels.sources.map((source, index) => ({
    id: source.id,
    title: source.title,
    creator: source.attribution,
    description: copy.generatedDescription(source.version ?? copy.unknownRevision),
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
      description: copy.ofacDescription(
        OFAC_SNAPSHOT.counts.total,
        Object.keys(OFAC_SNAPSHOT.counts.byCurrency).length,
        screenable,
      ),
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
