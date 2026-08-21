import type { ChainId, Tag } from "../types";
import snapshot from "./generated/ofac-crypto.json";

/** Shape of the snapshot written by `npm run sync:ofac`. */
export interface OfacEntry {
  address: string;
  currency: string;
  chain: string | null;
  fixedRef: string;
  name: string;
  partyType: string;
  list: string;
  programs: string[];
  designatedAt: string | null;
}

export interface OfacFileMeta {
  name: string;
  dateOfIssue: string | null;
  bytes: number;
  sha256: string;
  addresses: number;
}

export interface OfacSnapshot {
  schema: number;
  source: string;
  retrievedAt: string;
  files: OfacFileMeta[];
  counts: {
    total: number;
    byCurrency: Record<string, number>;
    byChain: Record<string, number>;
  };
  entries: OfacEntry[];
}

export const OFAC_SNAPSHOT = snapshot as OfacSnapshot;

/** A snapshot older than this is reported as stale. OFAC publishes on business
 *  days, so a week without a refresh means designations are probably missing. */
const STALE_AFTER_DAYS = 7;

export function snapshotAgeDays(): number {
  const issued = OFAC_SNAPSHOT.files.find((file) => file.dateOfIssue)?.dateOfIssue;
  const reference = issued ? new Date(issued) : new Date(OFAC_SNAPSHOT.retrievedAt);
  return Math.floor((Date.now() - reference.getTime()) / 86_400_000);
}

export function isSnapshotStale(): boolean {
  return snapshotAgeDays() > STALE_AFTER_DAYS;
}

export function snapshotIssuedAt(): string | null {
  return OFAC_SNAPSHOT.files.find((file) => file.dateOfIssue)?.dateOfIssue ?? null;
}

/** Programs present in the snapshot, most-listed first — the shape of the
 *  designated population, useful context on the tags screen. */
export function programBreakdown(limit = 8): { program: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of OFAC_SNAPSHOT.entries) {
    for (const program of entry.programs) {
      counts.set(program, (counts.get(program) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([program, count]) => ({ program, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function toTag(entry: OfacEntry): Tag {
  const programs = entry.programs.length ? entry.programs.join(", ") : "unspecified programme";
  const designated = entry.designatedAt ? `, designated ${entry.designatedAt}` : "";
  return {
    id: `ofac:${entry.currency}:${entry.address}`,
    chain: entry.chain as ChainId,
    subject: entry.address,
    label: entry.name,
    category: "unknown",
    // Non-SDN lists impose narrower restrictions than blocking, but every list in
    // this file is still a sanctions hit for screening purposes.
    abuse: "sanctions",
    // A published address on a US government list is an identifier match, not an
    // inference — there is no confidence to discount.
    confidence: 1,
    source: "sanctions",
    pack: "ofac-sls",
    createdAt: OFAC_SNAPSHOT.retrievedAt,
    notes: `${entry.list} · ${entry.partyType} · ${programs}${designated} · OFAC uid ${entry.fixedRef}.`,
  };
}

/** Address index. Digital currency addresses are exact-match identifiers, so the
 *  only normalisation applied is the case-folding each chain actually permits. */
function buildIndex(): Map<string, Tag[]> {
  const index = new Map<string, Tag[]>();
  for (const entry of OFAC_SNAPSHOT.entries) {
    if (entry.chain !== "btc" && entry.chain !== "eth") continue;
    const key = indexKey(entry.chain, entry.address);
    const tag = toTag(entry);
    const bucket = index.get(key);
    if (bucket) bucket.push(tag);
    else index.set(key, [tag]);
  }
  return index;
}

/** Ethereum addresses are hex and case-insensitive (mixed case is a checksum).
 *  Bitcoin bech32 is case-insensitive but never mixed; base58 IS case-sensitive,
 *  so folding it would risk matching an address OFAC never listed. */
export function indexKey(chain: ChainId, address: string): string {
  const value = address.trim();
  if (chain === "eth") return `eth:${value.toLowerCase()}`;
  if (/^(bc1|tb1)/i.test(value)) return `btc:${value.toLowerCase()}`;
  return `btc:${value}`;
}

const INDEX = buildIndex();

export function ofacTagsFor(chain: ChainId, address: string): Tag[] {
  return INDEX.get(indexKey(chain, address)) ?? [];
}

export function ofacTagCount(): number {
  return [...INDEX.values()].reduce((sum, tags) => sum + tags.length, 0);
}

/** Every screenable OFAC tag, for the tags screen listing. */
export function allOfacTags(): Tag[] {
  return [...INDEX.values()].flat();
}
