/**
 * Pulls OFAC digital-currency addresses from the Sanctions List Service and
 * writes an immutable local snapshot.
 *
 *   npm run sync:ofac            fetch, validate, write
 *   npm run sync:ofac -- --force skip the delta-ceiling guard
 *   npm run sync:ofac -- --dry   parse and report, write nothing
 *
 * Design notes:
 * - SLS is a file distribution service, not a screening API. Everything below
 *   the download — parsing, normalisation, matching — is ours.
 * - A `User-Agent` header is mandatory; SLS answers 403 without one.
 * - Reference IDs (feature types, lists, programs, scripts) are resolved from
 *   the ReferenceValueSets block of the same file version, never hardcoded.
 *   OFAC adds values, and a stale hardcoded map mislabels silently.
 * - The snapshot records the file's DateOfIssue and SHA-256 so any screening
 *   decision can be reproduced against the exact list state that produced it.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://sanctionslistservice.ofac.treas.gov";
const USER_AGENT = "ChainLens/0.1 (cryptoasset sanctions screening)";

const SOURCES = [
  { file: "SDN_ADVANCED.XML", label: "SDN" },
  // The Consolidated (non-SDN) file carries no digital-currency features today,
  // but it is small and OFAC can add them — ingesting it now means a non-SDN
  // crypto listing lands automatically instead of being silently missed.
  { file: "CONS_ADVANCED.XML", label: "Consolidated" },
] as const;

/** Refuse a snapshot that lost more than this share of its addresses. A
 *  truncated or partially-parsed file produces a clean run with too few hits,
 *  which is the worst failure mode in sanctions screening. */
const MAX_SHRINK = 0.2;
const MIN_TOTAL = 200;

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(HERE, "..", "src", "lib", "tags", "generated", "ofac-crypto.json");

/** OFAC currency codes mapped onto the chains ChainLens can actually screen.
 *  Unmapped currencies are still stored, so adding a chain needs no re-sync. */
const CURRENCY_TO_CHAIN: Record<string, string> = {
  XBT: "btc",
  ETH: "eth",
};

interface SanctionedAddress {
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

interface FileMeta {
  name: string;
  dateOfIssue: string | null;
  bytes: number;
  sha256: string;
  addresses: number;
}

interface Snapshot {
  schema: 1;
  source: string;
  retrievedAt: string;
  files: FileMeta[];
  counts: {
    total: number;
    byCurrency: Record<string, number>;
    byChain: Record<string, number>;
  };
  entries: SanctionedAddress[];
}

/* ------------------------------------------------------------------ fetch */

async function download(file: string): Promise<string> {
  // Re-running the parser against a 120 MB download is slow and rude to a public
  // government service; point OFAC_LOCAL_DIR at a previously fetched copy to skip it.
  const localDir = process.env.OFAC_LOCAL_DIR;
  if (localDir) {
    const body = await readFile(join(localDir, file), "utf8");
    console.log(`(local copy) `);
    return body;
  }

  const url = `${BASE}/api/download/${file}`;
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/xml" },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`${file}: SLS responded ${response.status} ${response.statusText}`);
  }

  const body = await response.text();
  if (body.length < 100_000) {
    throw new Error(`${file}: response is ${body.length} bytes — refusing a truncated list`);
  }
  if (!body.includes("<ReferenceValueSets>") || !body.includes("<DistinctParties>")) {
    throw new Error(`${file}: response is not an advanced-XML sanctions file`);
  }
  return body;
}

/* ----------------------------------------------------------------- parse */

function referenceMap(block: string, tag: string): Map<string, string> {
  const map = new Map<string, string>();
  const pattern = new RegExp(`<${tag} ID="(\\d+)"[^>]*>([^<]*)</${tag}>`, "g");
  for (const match of block.matchAll(pattern)) map.set(match[1], decodeXml(match[2]));
  return map;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .trim();
}

function dateOfIssue(xml: string): string | null {
  const block = xml.slice(0, 4000).match(/<DateOfIssue[^>]*>([\s\S]*?)<\/DateOfIssue>/);
  if (!block) return null;
  const year = block[1].match(/<Year>(\d+)<\/Year>/)?.[1];
  const month = block[1].match(/<Month>(\d+)<\/Month>/)?.[1];
  const day = block[1].match(/<Day>(\d+)<\/Day>/)?.[1];
  if (!year || !month || !day) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** SanctionsEntry sits in its own section keyed by ProfileID; programs live in
 *  the measure comments and the list in the entry's ListID. */
function parseSanctionsEntries(
  xml: string,
  lists: Map<string, string>,
): Map<string, { list: string; programs: string[]; designatedAt: string | null }> {
  const byProfile = new Map<
    string,
    { list: string; programs: string[]; designatedAt: string | null }
  >();

  // Scan only the SanctionsEntries section — running a regex across the whole
  // 120 MB document costs far more than slicing it first.
  const start = xml.indexOf("<SanctionsEntries>");
  const end = xml.indexOf("</SanctionsEntries>");
  const section = start >= 0 && end > start ? xml.slice(start, end) : xml;

  for (const match of section.matchAll(
    /<SanctionsEntry [^>]*ProfileID="(\d+)"[^>]*ListID="(\d+)"[^>]*>([\s\S]*?)<\/SanctionsEntry>/g,
  )) {
    const [, profileId, listId, body] = match;
    const programs = [...body.matchAll(/<Comment>([^<]+)<\/Comment>/g)]
      .map((entry) => decodeXml(entry[1]))
      .filter(Boolean);

    const event = body.match(/<EntryEvent[\s\S]*?<\/EntryEvent>/)?.[0] ?? "";
    const year = event.match(/<Year>(\d+)<\/Year>/)?.[1];
    const month = event.match(/<Month>(\d+)<\/Month>/)?.[1];
    const day = event.match(/<Day>(\d+)<\/Day>/)?.[1];

    byProfile.set(profileId, {
      list: lists.get(listId) ?? `List ${listId}`,
      programs: [...new Set(programs)],
      designatedAt:
        year && month && day
          ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
          : null,
    });
  }

  return byProfile;
}

/** Primary name, preferring the Latin-script rendering. Name parts are joined in
 *  document order — reordering them is how "Ivanov Sergey" becomes unmatchable. */
function primaryName(partyXml: string, latinScriptIds: Set<string>): string {
  const aliases = [...partyXml.matchAll(/<Alias [^>]*>[\s\S]*?<\/Alias>/g)].map((m) => m[0]);
  const primary =
    aliases.find((alias) => /AliasTypeID="1403"/.test(alias) && /Primary="true"/.test(alias)) ??
    aliases.find((alias) => /Primary="true"/.test(alias)) ??
    aliases[0];
  if (!primary) return "Unnamed party";

  const documented = [...primary.matchAll(/<DocumentedName [^>]*>[\s\S]*?<\/DocumentedName>/g)].map(
    (m) => m[0],
  );

  const scored = documented.map((doc) => {
    const parts = [...doc.matchAll(/<NamePartValue [^>]*ScriptID="(\d+)"[^>]*>([^<]*)<\/NamePartValue>/g)];
    const latin = parts.every((part) => latinScriptIds.has(part[1]));
    return { latin, text: parts.map((part) => decodeXml(part[2])).filter(Boolean).join(" ") };
  });

  return (scored.find((entry) => entry.latin && entry.text) ?? scored.find((entry) => entry.text))
    ?.text ?? "Unnamed party";
}

function parseFile(xml: string, fileName: string): { entries: SanctionedAddress[]; meta: FileMeta } {
  const rvsEnd = xml.indexOf("</ReferenceValueSets>");
  const rvs = xml.slice(0, rvsEnd);

  const featureTypes = referenceMap(rvs, "FeatureType");
  const lists = referenceMap(rvs, "List");
  // PartySubType 3 and 4 are both literally named "Unknown"; the meaningful
  // label (Individual / Entity / Vessel / Aircraft) hangs off their PartyTypeID.
  const partyTypes = referenceMap(rvs, "PartyType");
  const partySubTypes = new Map<string, string>();
  for (const match of rvs.matchAll(
    /<PartySubType ID="(\d+)" PartyTypeID="(\d+)"[^>]*>([^<]*)<\/PartySubType>/g,
  )) {
    const own = decodeXml(match[3]);
    partySubTypes.set(
      match[1],
      own && own !== "Unknown" ? own : (partyTypes.get(match[2]) ?? (own || "Unknown")),
    );
  }
  const scripts = referenceMap(rvs, "Script");

  const latinScriptIds = new Set(
    [...scripts.entries()].filter(([, name]) => /latin/i.test(name)).map(([id]) => id),
  );

  const cryptoFeatureTypes = new Map<string, string>();
  for (const [id, name] of featureTypes) {
    const currency = name.match(/^Digital Currency Address - ([A-Z0-9]+)$/)?.[1];
    if (currency) cryptoFeatureTypes.set(id, currency);
  }
  // Not every list publishes crypto feature types — the Consolidated file
  // currently has none. That is a legitimate empty result, not a parse failure;
  // the global floor check below catches a genuinely broken ingest.
  if (!cryptoFeatureTypes.size) {
    return {
      entries: [],
      meta: {
        name: fileName,
        dateOfIssue: dateOfIssue(xml),
        bytes: Buffer.byteLength(xml),
        sha256: createHash("sha256").update(xml).digest("hex"),
        addresses: 0,
      },
    };
  }

  const sanctionsEntries = parseSanctionsEntries(xml, lists);

  const entries: SanctionedAddress[] = [];
  const seen = new Set<string>();

  // A lazy regex over a 120 MB string backtracks itself to a standstill; walk the
  // party boundaries with indexOf instead, which is linear.
  const OPEN = "<DistinctParty ";
  const CLOSE = "</DistinctParty>";
  let cursor = xml.indexOf("<DistinctParties>");

  while (cursor >= 0) {
    const startIndex = xml.indexOf(OPEN, cursor);
    if (startIndex < 0) break;
    const endIndex = xml.indexOf(CLOSE, startIndex);
    if (endIndex < 0) break;
    const party = xml.slice(startIndex, endIndex + CLOSE.length);
    cursor = endIndex + CLOSE.length;

    if (!party.includes("FeatureTypeID=")) continue;

    const features = [...party.matchAll(
      /<Feature ID="\d+" FeatureTypeID="(\d+)">([\s\S]*?)<\/Feature>/g,
    )].filter((feature) => cryptoFeatureTypes.has(feature[1]));
    if (!features.length) continue;

    const fixedRef = party.match(/<DistinctParty FixedRef="(\d+)"/)?.[1] ?? "";
    const profileId = party.match(/<Profile ID="(\d+)"/)?.[1] ?? "";
    const partySubTypeId = party.match(/<Profile [^>]*PartySubTypeID="(\d+)"/)?.[1] ?? "";
    const name = primaryName(party, latinScriptIds);
    const entry = sanctionsEntries.get(profileId);

    for (const [, featureTypeId, body] of features) {
      const currency = cryptoFeatureTypes.get(featureTypeId)!;
      for (const detail of body.matchAll(/<VersionDetail[^>]*>([^<]+)<\/VersionDetail>/g)) {
        const address = decodeXml(detail[1]);
        if (!address) continue;

        const key = `${currency}:${address.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        entries.push({
          address,
          currency,
          chain: CURRENCY_TO_CHAIN[currency] ?? null,
          fixedRef,
          name,
          partyType: partySubTypes.get(partySubTypeId) ?? "Unknown",
          list: entry?.list ?? lists.get("1550") ?? "SDN List",
          programs: entry?.programs ?? [],
          designatedAt: entry?.designatedAt ?? null,
        });
      }
    }
  }

  return {
    entries,
    meta: {
      name: fileName,
      dateOfIssue: dateOfIssue(xml),
      bytes: Buffer.byteLength(xml),
      sha256: createHash("sha256").update(xml).digest("hex"),
      addresses: entries.length,
    },
  };
}

/* ------------------------------------------------------------------- run */

async function main() {
  const args = new Set(process.argv.slice(2));
  const force = args.has("--force");
  const dryRun = args.has("--dry");

  const files: FileMeta[] = [];
  const entries: SanctionedAddress[] = [];

  for (const source of SOURCES) {
    process.stdout.write(`↓ ${source.file} … `);
    const xml = await download(source.file);
    const parsed = parseFile(xml, source.file);
    files.push(parsed.meta);
    entries.push(...parsed.entries);
    console.log(
      `${(parsed.meta.bytes / 1e6).toFixed(1)} MB · issued ${parsed.meta.dateOfIssue ?? "?"} · ${parsed.entries.length} addresses`,
    );
  }

  const byCurrency: Record<string, number> = {};
  const byChain: Record<string, number> = {};
  for (const entry of entries) {
    byCurrency[entry.currency] = (byCurrency[entry.currency] ?? 0) + 1;
    if (entry.chain) byChain[entry.chain] = (byChain[entry.chain] ?? 0) + 1;
  }

  if (entries.length < MIN_TOTAL && !force) {
    throw new Error(
      `Parsed only ${entries.length} addresses (floor ${MIN_TOTAL}). Refusing to write — re-run with --force if OFAC really shrank the list.`,
    );
  }

  const previous = await readFile(OUT_PATH, "utf8")
    .then((raw) => JSON.parse(raw) as Snapshot)
    .catch(() => null);

  if (previous && !force) {
    const floor = previous.counts.total * (1 - MAX_SHRINK);
    if (entries.length < floor) {
      throw new Error(
        `Address count fell from ${previous.counts.total} to ${entries.length} (>${MAX_SHRINK * 100}% drop). Refusing to write — re-run with --force after confirming against OFAC.`,
      );
    }
  }

  const snapshot: Snapshot = {
    schema: 1,
    source: "OFAC Sanctions List Service",
    retrievedAt: new Date().toISOString(),
    files,
    counts: { total: entries.length, byCurrency, byChain },
    entries: entries.sort((a, b) =>
      a.currency === b.currency
        ? a.address.localeCompare(b.address)
        : a.currency.localeCompare(b.currency),
    ),
  };

  console.log(
    `\n${snapshot.counts.total} addresses · screenable: ${Object.entries(byChain)
      .map(([chain, count]) => `${chain.toUpperCase()} ${count}`)
      .join(", ") || "none"}`,
  );
  if (previous) {
    const delta = snapshot.counts.total - previous.counts.total;
    console.log(
      `previous snapshot ${previous.files[0]?.dateOfIssue ?? "?"} had ${previous.counts.total} (${
        delta >= 0 ? "+" : ""
      }${delta})`,
    );
  }

  if (dryRun) {
    console.log("\n--dry: nothing written.");
    return;
  }

  await mkdir(dirname(OUT_PATH), { recursive: true });
  const temporary = `${OUT_PATH}.tmp`;
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await rename(temporary, OUT_PATH);
  console.log(`\n✓ wrote ${OUT_PATH}`);
}

main().catch((error: unknown) => {
  console.error(`\n✗ OFAC sync failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
