import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { displayName } from "../format";
import type { ActorCategory, ChainId, Tag } from "../types";

/**
 * Actor attribution built by `npm run sync:labels` from open-source label feeds.
 *
 * The snapshot is read from disk rather than `import`ed on purpose: it runs to
 * double-digit megabytes, and inlining that into the server bundle would inflate
 * build output and cold starts for data that only ever needs a point lookup.
 * `next.config.ts` traces the file into the standalone output.
 *
 * It is stored gzipped. The payload compresses better than 2:1, which halves what
 * every changed snapshot costs the repository forever, and gunzip adds about 30ms
 * once per process against a parse that costs five times that.
 */

export interface ActorRecord {
  id: string;
  name: string;
  category: string;
  uri: string | null;
  jurisdictions: string[];
}

export interface LabelRecord {
  label: string;
  category: string;
  actor: number | null;
  source: number;
  pack: string;
  confidence: number;
  reference: string | null;
}

export interface LabelSourceMeta {
  id: string;
  title: string;
  homepage: string;
  licence: string;
  attribution: string;
  version: string | null;
  addresses: number;
}

export interface LabelSnapshot {
  schema: number;
  profile: string;
  generatedAt: string;
  sources: LabelSourceMeta[];
  excluded: { id: string; title: string; homepage: string; licence: string; reason: string }[];
  actors: ActorRecord[];
  labels: LabelRecord[];
  counts: {
    total: number;
    byChain: Record<string, number>;
    byCategory: Record<string, number>;
    skipped: { pack: string; reason: string; dropped: number }[];
  };
  addresses: Record<string, Record<string, number>>;
}

const EMPTY: LabelSnapshot = {
  schema: 1,
  profile: "missing",
  generatedAt: new Date(0).toISOString(),
  sources: [],
  excluded: [],
  actors: [],
  labels: [],
  counts: { total: 0, byChain: {}, byCategory: {}, skipped: [] },
  addresses: { btc: {}, eth: {} },
};

let cache: LabelSnapshot | null = null;
let loadError: string | null = null;

/** Parsed once on first use. A missing file is not fatal — the app still runs on
 *  the sanctions feed and the curated fallback pack — but it is reported so the
 *  gap never passes for "this address has no attribution". */
export function labelSnapshot(): LabelSnapshot {
  if (cache) return cache;
  try {
    const path = join(process.cwd(), "data", "actor-labels.json.gz");
    const parsed = JSON.parse(
      gunzipSync(readFileSync(path)).toString("utf8"),
    ) as Partial<LabelSnapshot>;
    // A snapshot written by an older revision of the sync script must degrade,
    // not crash the page it appears on.
    cache = {
      ...EMPTY,
      ...parsed,
      sources: parsed.sources ?? [],
      excluded: parsed.excluded ?? [],
      actors: parsed.actors ?? [],
      labels: parsed.labels ?? [],
      counts: { ...EMPTY.counts, ...parsed.counts },
      addresses: { btc: {}, eth: {}, ...parsed.addresses },
    };
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error);
    cache = EMPTY;
  }
  return cache;
}

export function labelSnapshotError(): string | null {
  labelSnapshot();
  return loadError;
}

export function hasLabelSnapshot(): boolean {
  return labelSnapshot().counts.total > 0;
}

/** Ethereum hex and Bitcoin bech32 are case-insensitive; Bitcoin base58 is not.
 *  Must stay identical to the keying in `scripts/sync-labels.mts`. */
function indexKey(chain: ChainId, address: string): string {
  const value = address.trim();
  if (chain === "eth") return value.toLowerCase();
  if (/^(bc1|tb1)/i.test(value)) return value.toLowerCase();
  return value;
}

const CATEGORIES = new Set<ActorCategory>([
  "exchange",
  "mining-pool",
  "gambling",
  "mixer",
  "defi",
  "bridge",
  "merchant",
  "wallet-service",
  "token",
  "individual",
  "unknown",
]);

function toActorCategory(value: string): ActorCategory {
  return CATEGORIES.has(value as ActorCategory) ? (value as ActorCategory) : "unknown";
}

export function actorLabelsFor(chain: ChainId, address: string): Tag[] {
  const snapshot = labelSnapshot();
  const bucket = snapshot.addresses[chain];
  if (!bucket) return [];

  const index = bucket[indexKey(chain, address)];
  if (index === undefined) return [];

  const record = snapshot.labels[index];
  if (!record) return [];

  const actor = record.actor == null ? null : snapshot.actors[record.actor];
  const source = snapshot.sources[record.source];

  const provenance = [
    source ? `${source.title}` : null,
    `pack ${record.pack}`,
    actor?.uri ?? record.reference,
    actor?.jurisdictions.length ? `jurisdiction ${actor.jurisdictions.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return [
    {
      id: `label:${chain}:${indexKey(chain, address)}`,
      chain,
      subject: address,
      label: displayName(actor?.name ?? record.label),
      // The pack category describes this address; the actor category describes
      // the organisation. Prefer the address-level one, and only fall back to
      // the actor when the pack had nothing specific to say.
      category: toActorCategory(
        record.category && record.category !== "unknown" ? record.category : (actor?.category ?? "unknown"),
      ),
      abuse: "none",
      confidence: record.confidence,
      source: "tagpack",
      pack: source?.id ?? "open-labels",
      createdAt: snapshot.generatedAt,
      notes: provenance || undefined,
    },
  ];
}

/** Top actors by how many addresses carry their label — the shape of the feed. */
export function actorLeaderboard(limit = 12): {
  actor: ActorRecord | null;
  label: string;
  category: string;
  addresses: number;
}[] {
  const snapshot = labelSnapshot();
  const perLabel = new Array<number>(snapshot.labels.length).fill(0);
  for (const bucket of Object.values(snapshot.addresses)) {
    for (const index of Object.values(bucket)) perLabel[index] = (perLabel[index] ?? 0) + 1;
  }

  const byActor = new Map<string, { actor: ActorRecord | null; label: string; category: string; addresses: number }>();
  snapshot.labels.forEach((record, index) => {
    const actor = record.actor == null ? null : snapshot.actors[record.actor];
    const key = actor?.id ?? record.label;
    const existing = byActor.get(key);
    if (existing) {
      existing.addresses += perLabel[index] ?? 0;
      return;
    }
    byActor.set(key, {
      actor: actor ?? null,
      label: displayName(actor?.name ?? record.label),
      category:
        record.category && record.category !== "unknown"
          ? record.category
          : (actor?.category ?? "unknown"),
      addresses: perLabel[index] ?? 0,
    });
  });

  return [...byActor.values()]
    .filter((entry) => entry.addresses > 0)
    .sort((a, b) => b.addresses - a.addresses)
    .slice(0, limit);
}
