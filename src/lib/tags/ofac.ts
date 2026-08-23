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
let programsMemo: { program: string; count: number }[] | null = null;

export function programBreakdown(limit = 8): { program: string; count: number }[] {
  if (!programsMemo) {
    const counts = new Map<string, number>();
    for (const entry of OFAC_SNAPSHOT.entries) {
      for (const program of entry.programs) {
        counts.set(program, (counts.get(program) ?? 0) + 1);
      }
    }
    programsMemo = [...counts.entries()]
      .map(([program, count]) => ({ program, count }))
      .sort((a, b) => b.count - a.count);
  }
  return programsMemo.slice(0, limit);
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
    if (!isScreenableChain(entry.chain)) continue;
    const key = indexKey(entry.chain, entry.address);
    const tag = toTag(entry);
    const bucket = index.get(key);
    if (bucket) bucket.push(tag);
    else index.set(key, [tag]);
  }
  return index;
}

/** Chains this app can screen against. Anything else in the snapshot is kept
 *  on disk but not indexed, so adding a chain needs no re-sync. */
function isScreenableChain(chain: string | null): chain is ChainId {
  return chain === "btc" || chain === "eth" || chain === "tron";
}

/** Ethereum addresses are hex and case-insensitive (mixed case is a checksum).
 *  Bitcoin bech32 is case-insensitive but never mixed; base58 IS case-sensitive,
 *  so folding it would risk matching an address OFAC never listed. */
export function indexKey(chain: ChainId, address: string): string {
  const value = address.trim();
  if (chain === "eth") return `eth:${value.toLowerCase()}`;
  // TRON is Base58Check like Bitcoin's legacy format and is equally
  // case-sensitive: folding it would risk matching an account never listed.
  if (chain === "tron") return `tron:${value}`;
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

/**
 * The screenable snapshot, encoded for the wire.
 *
 * The tags screen filters these rows in the browser, which means every one of
 * them has to reach it - but sent as a row per object they cost 128 KB of the
 * page's RSC payload to display forty at a time. Only the address is actually
 * high-entropy: across 627 rows there is one distinct list name, two party
 * types, two chains, twenty-three programme sets, forty-six designation dates
 * and seventy-five designated parties. Repeating those inline, with their keys,
 * is most of the weight.
 *
 * So the columns are interned and indexed. Addresses stay verbatim, everything
 * else becomes a small dictionary plus one index per row, and the panel rebuilds
 * the rows once on mount. Same data, same instant filtering, about a third of
 * the bytes.
 *
 * `list` and `currency` are absent because nothing reads them: `list` was never
 * displayed, and `currency` only keyed a table row, which `chain:address`
 * already does uniquely.
 */
export interface OfacTable {
  addresses: string[];
  /** Dictionaries. The `*Of` arrays below hold one index into each, per row. */
  names: string[];
  programSets: string[][];
  dates: (string | null)[];
  partyTypes: string[];
  chains: ChainId[];
  nameOf: number[];
  programsOf: number[];
  dateOf: number[];
  partyTypeOf: number[];
  chainOf: number[];
}

/** Interns a column, returning its dictionary and one index per row. */
function intern<T>(values: T[], key: (value: T) => string): { dict: T[]; index: number[] } {
  const seen = new Map<string, number>();
  const dict: T[] = [];
  const index = values.map((value) => {
    const k = key(value);
    let at = seen.get(k);
    if (at === undefined) {
      at = dict.length;
      dict.push(value);
      seen.set(k, at);
    }
    return at;
  });
  return { dict, index };
}

/** Built once. The snapshot is a frozen import that only changes when the sync
 *  job writes a new one and the process restarts, and the page is force-dynamic,
 *  so without this every request re-filtered 974 entries and re-interned five
 *  columns to produce a byte-identical result. */
let tableMemo: OfacTable | null = null;

export function screenableTable(): OfacTable {
  if (tableMemo) return tableMemo;

  const entries = OFAC_SNAPSHOT.entries.filter(
    (entry): entry is OfacEntry & { chain: ChainId } =>
      isScreenableChain(entry.chain),
  );

  const names = intern(entries.map((e) => e.name), (v) => v);
  const programSets = intern(entries.map((e) => e.programs), (v) => v.join("\u0000"));
  const dates = intern(entries.map((e) => e.designatedAt), (v) => String(v));
  const partyTypes = intern(entries.map((e) => e.partyType), (v) => v);
  const chains = intern(entries.map((e) => e.chain), (v) => v);

  tableMemo = {
    addresses: entries.map((e) => e.address),
    names: names.dict,
    programSets: programSets.dict,
    dates: dates.dict,
    partyTypes: partyTypes.dict,
    chains: chains.dict,
    nameOf: names.index,
    programsOf: programSets.index,
    dateOf: dates.index,
    partyTypeOf: partyTypes.index,
    chainOf: chains.index,
  };
  return tableMemo;
}

/** Every screenable OFAC tag, for the tags screen listing. */
export function allOfacTags(): Tag[] {
  return [...INDEX.values()].flat();
}
