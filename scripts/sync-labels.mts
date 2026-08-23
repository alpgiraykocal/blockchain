/**
 * Builds the actor-attribution snapshot from open-source label feeds.
 *
 *   npm run sync:labels                      standard profile (default)
 *   npm run sync:labels -- --profile core    hub and service wallets only
 *   npm run sync:labels -- --profile full    everything the feeds publish
 *   npm run sync:labels -- --dry             parse and report, write nothing
 *
 * Output: data/actor-labels.json - read at runtime with fs, deliberately NOT
 * imported, so a multi-megabyte label set never lands inside the server bundle.
 *
 * Shape is dictionary-compressed: label strings repeat tens of thousands of
 * times across a feed ("Safev1.1.1", "Huobi.com"), so addresses point at indices
 * into shared actor and label tables rather than carrying their own copies.
 */

import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { parse as parseYaml } from "yaml";
import {
  CATEGORY_MAP,
  CONFIDENCE_MAP,
  DEFAULT_CONFIDENCE,
  SOURCES,
  pickCategory,
  type SourceId,
} from "./sources.mts";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(HERE, "..", "data", "actor-labels.json.gz");
/** A small readable companion, so a pull request that carries a binary payload
 *  still shows a reviewer what actually moved. */
const SUMMARY_PATH = join(HERE, "..", "data", "actor-labels.summary.md");
const USER_AGENT = "BlockchainAnalysis/0.1 (open label ingest)";

type Profile = "core" | "standard" | "full";

/** Per-profile ceiling on addresses taken from any single pack. Bulk deposit-address
 *  dumps (one exchange ships 350k of them) would otherwise dominate the snapshot
 *  and push it past what is sensible to commit and load. */
const PACK_LIMIT: Record<Profile, number> = {
  core: 2_000,
  standard: Number.POSITIVE_INFINITY,
  full: Number.POSITIVE_INFINITY,
};

/** Whole-snapshot ceiling, enforced after per-pack limits. `standard` is now
 *  uncapped: the cap only ever bit Bitcoin exchange deposit addresses, which are
 *  exactly the long tail that makes a real trace resolvable. The file is stored
 *  gzipped, so the cost of carrying all of it is about 10 MB rather than 22. */
const TOTAL_LIMIT: Record<Profile, number> = {
  core: 20_000,
  standard: Number.POSITIVE_INFINITY,
  full: Number.POSITIVE_INFINITY,
};

const SUPPORTED_CHAINS = new Set(["btc", "eth", "tron"]);

/* ------------------------------------------------------------------ types */

interface RawLabel {
  chain: string;
  address: string;
  label: string;
  category: string;
  actorId: string | null;
  confidence: number;
  source: SourceId;
  pack: string;
  reference: string | null;
}

interface Actor {
  id: string;
  name: string;
  category: string;
  uri: string | null;
  jurisdictions: string[];
}

interface SnapshotLabel {
  label: string;
  category: string;
  actor: number | null;
  source: number;
  pack: string;
  confidence: number;
  reference: string | null;
}

interface Snapshot {
  schema: 1;
  profile: Profile;
  /** When this exact snapshot content was first built. It deliberately does not
   *  move on a rebuild that produces identical data. */
  generatedAt: string;
  sources: {
    id: string;
    title: string;
    homepage: string;
    licence: string;
    attribution: string;
    version: string | null;
    addresses: number;
  }[];
  /** Feeds deliberately left out, with the reason — so the UI can say what is
   *  missing instead of silently under-reporting coverage. */
  excluded: { id: string; title: string; homepage: string; licence: string; reason: string }[];
  actors: Actor[];
  labels: SnapshotLabel[];
  counts: {
    total: number;
    byChain: Record<string, number>;
    byCategory: Record<string, number>;
    skipped: { pack: string; reason: string; dropped: number }[];
  };
  addresses: Record<string, Record<string, number>>;
}

/* --------------------------------------------------------------- fetching */

async function fetchTarball(
  owner: string,
  repo: string,
  ref: string,
): Promise<{ dir: string; root: string; version: string | null }> {
  const version = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${ref}`, {
    headers: { "user-agent": USER_AGENT, accept: "application/vnd.github+json" },
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((body: { sha?: string } | null) => body?.sha?.slice(0, 12) ?? null)
    .catch(() => null);

  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/refs/heads/${ref}`;
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok || !response.body) {
    throw new Error(`${owner}/${repo}: download failed with ${response.status}`);
  }

  const dir = await mkdtemp(join(tmpdir(), "blockchain-analysis-labels-"));
  const archive = join(dir, "repo.tar.gz");
  await pipeline(
    Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(archive),
  );

  const root = join(dir, "repo");
  await mkdir(root, { recursive: true });
  await run("tar", ["-xzf", archive, "-C", root, "--strip-components=1"]);
  await rm(archive, { force: true });

  return { dir, root, version };
}

/* -------------------------------------------------- graphsense tagpacks */

interface TagPackTag {
  address?: string;
  label?: string;
  category?: string;
  currency?: string;
  actor?: string;
  abuse?: string;
  confidence?: string;
  source?: string;
}

interface TagPackFile {
  title?: string;
  creator?: string;
  currency?: string;
  category?: string;
  label?: string;
  abuse?: string;
  confidence?: string;
  source?: string;
  actor?: string;
  tags?: TagPackTag[];
}

interface ActorPackFile {
  actors?: {
    id?: string;
    label?: string;
    uri?: string;
    categories?: string[];
    jurisdictions?: string[];
  }[];
}

function normaliseCurrency(value: string | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  if (code === "BTC" || code === "XBT") return "btc";
  if (code === "ETH") return "eth";
  if (code === "TRX") return "tron";
  return code.toLowerCase();
}

async function loadGraphSense(
  profile: Profile,
  skipped: Snapshot["counts"]["skipped"],
): Promise<{ labels: RawLabel[]; actors: Actor[]; version: string | null }> {
  const { dir, root, version } = await fetchTarball("graphsense", "graphsense-tagpacks", "master");

  // Actor metadata first: it turns a bare label like "Huobi.com" into a named
  // actor with a category and a homepage.
  const actors: Actor[] = [];
  try {
    const actorPack = parseYaml(
      await readFile(join(root, "actors", "graphsense.actorpack.yaml"), "utf8"),
    ) as ActorPackFile;
    for (const entry of actorPack.actors ?? []) {
      if (!entry.id) continue;
      actors.push({
        id: entry.id,
        name: entry.label ?? entry.id,
        category: pickCategory(entry.categories ?? []),
        uri: entry.uri ? (entry.uri.startsWith("http") ? entry.uri : `https://${entry.uri}`) : null,
        jurisdictions: entry.jurisdictions ?? [],
      });
    }
  } catch {
    skipped.push({ pack: "graphsense actorpack", reason: "unreadable", dropped: 0 });
  }

  const labels: RawLabel[] = [];
  const packDir = join(root, "packs");

  // Packs nest one level deep in places (defi_updated/), and a pack skipped
  // because the walk was shallow is a silent gap in coverage.
  const walk = async (base: string, prefix = ""): Promise<string[]> => {
    const found: string[] = [];
    for (const entry of await readdir(base, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        found.push(...(await walk(join(base, entry.name), `${prefix}${entry.name}/`)));
      } else if (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")) {
        found.push(`${prefix}${entry.name}`);
      }
    }
    return found;
  };
  const files = (await walk(packDir)).sort();

  for (const file of files) {
    let pack: TagPackFile;
    try {
      pack = parseYaml(await readFile(join(packDir, file), "utf8")) as TagPackFile;
    } catch (error) {
      skipped.push({
        pack: file,
        reason: `YAML parse failed: ${error instanceof Error ? error.message : "unknown"}`,
        dropped: 0,
      });
      continue;
    }

    const packChain = normaliseCurrency(pack.currency);
    const packCategory = pack.category;
    const packConfidence = CONFIDENCE_MAP[pack.confidence ?? ""] ?? DEFAULT_CONFIDENCE;
    const limit = PACK_LIMIT[profile];

    let taken = 0;
    let dropped = 0;
    let abuseSkipped = 0;

    for (const tag of pack.tags ?? []) {
      const address = tag.address?.toString().trim();
      if (!address) continue;

      const chain = normaliseCurrency(tag.currency) ?? packChain;
      if (!chain || !SUPPORTED_CHAINS.has(chain)) continue;

      // Abuse attribution is handled by the OFAC feed, which is authoritative.
      // Mixing third-party forensic abuse claims into the same risk model would
      // blur a legal determination with a research assertion.
      if (tag.abuse || pack.abuse) {
        abuseSkipped += 1;
        continue;
      }

      // A pack that declares no category still answers "who is this", which is
      // the question the graph asks. Dropping those cost 8,453 Ethereum labels
      // from a single pack; they now land as "unknown" and keep their label.
      const rawCategory = tag.category ?? packCategory;
      const category = (rawCategory ? CATEGORY_MAP[rawCategory] : undefined) ?? "unknown";

      // A tag with neither a category nor a label carries no information.
      const labelText = (tag.label ?? pack.label ?? tag.actor ?? pack.actor ?? "").toString().trim();
      if (!labelText) continue;

      if (taken >= limit) {
        dropped += 1;
        continue;
      }

      labels.push({
        chain,
        address,
        label: labelText,
        category,
        actorId: (tag.actor ?? pack.actor ?? null)?.toString() ?? null,
        confidence: CONFIDENCE_MAP[tag.confidence ?? ""] ?? packConfidence,
        source: "graphsense-tagpacks",
        pack: file.replace(/\.ya?ml$/, ""),
        reference: (tag.source ?? pack.source ?? null)?.toString() ?? null,
      });
      taken += 1;
    }

    if (dropped) {
      skipped.push({
        pack: file,
        reason: `per-pack cap of ${limit} addresses for profile "${profile}"`,
        dropped,
      });
    }
    if (abuseSkipped) {
      skipped.push({
        pack: file,
        reason: "abuse-tagged, deferred to the OFAC feed",
        dropped: abuseSkipped,
      });
    }
  }

  await rm(dir, { recursive: true, force: true });
  return { labels, actors, version };
}

/* ------------------------------------------------- mempool mining pools */

interface PoolEntry {
  name?: string;
  addresses?: string[];
  tags?: string[];
  link?: string;
}

async function loadMiningPools(): Promise<{ labels: RawLabel[]; version: string | null }> {
  const { dir, root, version } = await fetchTarball("mempool", "mining-pools", "master");
  const raw = JSON.parse(await readFile(join(root, "pools-v2.json"), "utf8")) as PoolEntry[];

  const labels: RawLabel[] = [];
  for (const pool of raw) {
    if (!pool.name) continue;
    for (const address of pool.addresses ?? []) {
      const value = address.trim();
      if (!value) continue;
      labels.push({
        chain: "btc",
        address: value,
        label: pool.name,
        category: "mining-pool",
        actorId: pool.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        // Pool payout addresses are published by the pools themselves and
        // corroborated by coinbase tags - strong, but self-reported.
        confidence: 0.9,
        source: "mempool-mining-pools",
        pack: "pools-v2",
        reference: pool.link ?? null,
      });
    }
  }

  await rm(dir, { recursive: true, force: true });
  return { labels, version };
}

/* ------------------------------------------------------ token registries */

/** Token contracts are among the most common counterparties in an Ethereum
 *  graph. Labelling one as "Tether USD" rather than leaving it untagged is the
 *  difference between a readable trace and a wall of hex. */
async function loadEthereumListsTokens(): Promise<{
  labels: RawLabel[];
  version: string | null;
}> {
  const { dir, root, version } = await fetchTarball("ethereum-lists", "tokens", "master");

  const labels: RawLabel[] = [];
  const tokenDir = join(root, "tokens", "eth");
  for (const file of await readdir(tokenDir).catch(() => [] as string[])) {
    if (!file.endsWith(".json")) continue;
    const body = JSON.parse(await readFile(join(tokenDir, file), "utf8")) as {
      address?: string;
      name?: string;
      symbol?: string;
      website?: string;
    };
    const address = body.address ?? file.replace(/\.json$/, "");
    if (!address) continue;
    const name = body.name ?? body.symbol;
    if (!name) continue;
    labels.push({
      chain: "eth",
      address,
      label: body.symbol && body.name && body.symbol !== body.name ? `${body.name} (${body.symbol})` : name,
      category: "token",
      actorId: null,
      // Community-maintained registry with per-token review, but no on-chain
      // proof that the entry matches the deployed contract.
      confidence: 0.75,
      source: "ethereum-lists-tokens",
      pack: "tokens/eth",
      reference: body.website || null,
    });
  }

  await rm(dir, { recursive: true, force: true });
  return { labels, version };
}

/** A single curated list of the majors, published as one file. Higher trust than
 *  the long tail, so it wins collisions against the broader registry. */
async function loadTrustWalletTokens(): Promise<{ labels: RawLabel[]; version: string | null }> {
  const url =
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/tokenlist.json";
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`trustwallet tokenlist: ${response.status}`);
  const body = (await response.json()) as {
    version?: { major?: number; minor?: number; patch?: number };
    tokens?: { chainId?: number; address?: string; name?: string; symbol?: string }[];
  };

  const labels: RawLabel[] = [];
  for (const token of body.tokens ?? []) {
    // The file is already scoped to Ethereum, and 250 of its 289 entries omit
    // chainId entirely - requiring chainId === 1 silently dropped nearly all of
    // them. Trust the file's scope, but insist the address is a mainnet hex.
    if (token.chainId != null && token.chainId !== 1) continue;
    if (!token.address || !token.name) continue;
    if (!/^0x[0-9a-fA-F]{40}$/.test(token.address)) continue;
    labels.push({
      chain: "eth",
      address: token.address,
      label: token.symbol && token.symbol !== token.name ? `${token.name} (${token.symbol})` : token.name,
      category: "token",
      actorId: null,
      confidence: 0.85,
      source: "trustwallet-assets",
      pack: "ethereum/tokenlist",
      reference: "https://github.com/trustwallet/assets",
    });
  }

  const v = body.version;
  return {
    labels,
    version: v ? `${v.major ?? 0}.${v.minor ?? 0}.${v.patch ?? 0}` : null,
  };
}

/* ------------------------------------------------------------ trust wallet tron */

/**
 * TRON attribution from the same Trust Wallet registry, which covers the chain
 * in two places the Ethereum token list does not reach.
 *
 * `blockchains/tron/assets/<contract>/info.json` holds TRC-20 contracts, keyed
 * by their Base58 address. Roughly half the folders there are TRC-10 tokens
 * keyed by a numeric id instead, and those are skipped: a numeric id is not an
 * address and cannot be screened against one.
 *
 * `validators/list.json` names the super representatives. It is a short list,
 * but the entries are real organisations — Binance and InfStones among them —
 * and on a chain with no other actor attribution a dozen named entities is
 * worth more than its size suggests.
 */
async function loadTrustWalletTron(): Promise<{ labels: RawLabel[]; version: string | null }> {
  const labels: RawLabel[] = [];
  const base = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron";

  /* validators */
  const validators = await fetch(`${base}/validators/list.json`, {
    headers: { "user-agent": USER_AGENT },
  })
    .then((response) => (response.ok ? response.json() : []))
    .catch(() => []);

  for (const validator of (validators as { id?: string; name?: string }[]) ?? []) {
    if (!validator.id || !validator.name) continue;
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(validator.id)) continue;
    labels.push({
      chain: "tron",
      address: validator.id,
      label: validator.name,
      // A super representative produces blocks and is voted for; the closest
      // category this app renders is the one it uses for block producers.
      category: "mining-pool",
      actorId: null,
      confidence: 0.85,
      source: "trustwallet-assets",
      pack: "tron/validators",
      reference: "https://github.com/trustwallet/assets",
    });
  }

  /* TRC-20 contracts, listed through the git tree so the folder names arrive in
     one request rather than by crawling the directory. */
  const tree = (await fetch(
    "https://api.github.com/repos/trustwallet/assets/git/trees/master?recursive=1",
    { headers: { "user-agent": USER_AGENT, accept: "application/vnd.github+json" } },
  )
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null)) as { tree?: { path: string }[] } | null;

  const contracts = (tree?.tree ?? [])
    .map((entry) => entry.path)
    .filter((path) => /^blockchains\/tron\/assets\/T[1-9A-HJ-NP-Za-km-z]{33}\/info\.json$/.test(path))
    .map((path) => path.split("/")[3]);

  // Bounded concurrency: one request per contract against a public raw host, so
  // this stays polite rather than fast.
  const CONCURRENCY = 8;
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, contracts.length) }, async () => {
      while (cursor < contracts.length) {
        const contract = contracts[cursor++];
        const info = (await fetch(`${base}/assets/${contract}/info.json`, {
          headers: { "user-agent": USER_AGENT },
        })
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null)) as
          | { name?: string; symbol?: string; type?: string; status?: string }
          | null;
        if (!info?.name) continue;
        // A delisted or abandoned token is still an identifier worth resolving,
        // but it is not the same claim as an active one.
        if (info.status && info.status !== "active") continue;
        labels.push({
          chain: "tron",
          address: contract,
          label:
            info.symbol && info.symbol !== info.name ? `${info.name} (${info.symbol})` : info.name,
          category: "token",
          actorId: null,
          confidence: 0.85,
          source: "trustwallet-assets",
          pack: "tron/assets",
          reference: "https://github.com/trustwallet/assets",
        });
      }
    }),
  );

  return { labels, version: null };
}

/* ------------------------------------------------------ safe deployments */

/** Every Safe proxy on Ethereum is created by these factories and delegates to
 *  these singletons, so they turn up constantly as counterparties. */
async function loadSafeDeployments(): Promise<{ labels: RawLabel[]; version: string | null }> {
  const { dir, root, version } = await fetchTarball("safe-global", "safe-deployments", "main");

  const labels: RawLabel[] = [];
  const assets = join(root, "src", "assets");
  for (const release of await readdir(assets).catch(() => [] as string[])) {
    for (const file of await readdir(join(assets, release)).catch(() => [] as string[])) {
      if (!file.endsWith(".json")) continue;
      const body = JSON.parse(await readFile(join(assets, release, file), "utf8")) as {
        contractName?: string;
        version?: string;
        networkAddresses?: Record<string, string | string[]>;
        deployments?: Record<string, { address?: string }>;
      };
      const mainnet = body.networkAddresses?.["1"];
      if (!mainnet || !body.contractName) continue;

      for (const key of Array.isArray(mainnet) ? mainnet : [mainnet]) {
        const address = body.deployments?.[key]?.address;
        if (!address) continue;
        labels.push({
          chain: "eth",
          address,
          label: `Safe ${body.contractName} ${body.version ?? release}`,
          category: "wallet-service",
          actorId: "safe-global",
          // Published by the protocol team and verifiable on chain.
          confidence: 0.98,
          source: "safe-deployments",
          pack: `assets/${release}`,
          reference: "https://github.com/safe-global/safe-deployments",
        });
      }
    }
  }

  await rm(dir, { recursive: true, force: true });
  return { labels, version };
}

/* ---------------------------------------------- ethereum-lists contracts */

async function loadEthereumLists(
  profile: Profile,
  skipped: Snapshot["counts"]["skipped"],
): Promise<{ labels: RawLabel[]; version: string | null }> {
  const { dir, root, version } = await fetchTarball("ethereum-lists", "contracts", "main");

  const projects = new Map<string, { name: string; website: string | null }>();
  try {
    for (const file of await readdir(join(root, "projects"))) {
      if (!file.endsWith(".json")) continue;
      const body = JSON.parse(await readFile(join(root, "projects", file), "utf8")) as {
        name?: string;
        website?: string;
      };
      projects.set(file.replace(/\.json$/, ""), {
        name: body.name ?? file.replace(/\.json$/, ""),
        website: body.website ?? null,
      });
    }
  } catch {
    skipped.push({ pack: "ethereum-lists projects", reason: "unreadable", dropped: 0 });
  }

  const labels: RawLabel[] = [];
  const limit = PACK_LIMIT[profile];
  let dropped = 0;

  const mainnet = join(root, "contracts", "1");
  const files = await readdir(mainnet).catch(() => [] as string[]);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    if (labels.length >= limit) {
      dropped += 1;
      continue;
    }
    const body = JSON.parse(await readFile(join(mainnet, file), "utf8")) as {
      project?: string;
      name?: string;
    };
    if (!body.project) continue;
    const project = projects.get(body.project);
    const projectName = project?.name ?? body.project;
    labels.push({
      chain: "eth",
      address: file.replace(/\.json$/, ""),
      label: body.name ? `${projectName} ${body.name}` : projectName,
      category: "defi",
      actorId: body.project,
      confidence: 0.75,
      source: "ethereum-lists-contracts",
      pack: "contracts/1",
      reference: project?.website ?? null,
    });
  }

  if (dropped) {
    skipped.push({
      pack: "ethereum-lists contracts/1",
      reason: `per-pack cap of ${limit} addresses for profile "${profile}"`,
      dropped,
    });
  }

  await rm(dir, { recursive: true, force: true });
  return { labels, version };
}

/* ------------------------------------------------------------- assembly */

/** Ethereum hex and Bitcoin bech32 are case-insensitive; Bitcoin base58 and
 *  TRON Base58Check are not, and folding either would key an address the source
 *  never published. Must stay identical to `indexKey` in `src/lib/tags/actors.ts`. */
function indexKey(chain: string, address: string): string {
  const value = address.trim();
  if (chain === "eth") return value.toLowerCase();
  if (chain === "tron") return value;
  if (/^(bc1|tb1)/i.test(value)) return value.toLowerCase();
  return value;
}

function buildSnapshot(
  profile: Profile,
  collected: { labels: RawLabel[]; actors: Actor[]; versions: Map<SourceId, string | null> },
  skipped: Snapshot["counts"]["skipped"],
  includedIds: Set<SourceId>,
): Snapshot {
  const actorIndex = new Map<string, number>();
  const actors: Actor[] = [];
  for (const actor of collected.actors) {
    if (actorIndex.has(actor.id)) continue;
    actorIndex.set(actor.id, actors.length);
    actors.push(actor);
  }

  const sourceIds = [...new Set(collected.labels.map((label) => label.source))];
  const sourceIndex = new Map<SourceId, number>(sourceIds.map((id, index) => [id, index]));

  const labelIndex = new Map<string, number>();
  const labels: SnapshotLabel[] = [];
  const addresses: Record<string, Record<string, number>> = { btc: {}, eth: {}, tron: {} };

  const byChain: Record<string, number> = {};
  /** Chains a loader produced that this snapshot has no bucket for. */
  const unknownChains = new Map<string, number>();
  const byCategory: Record<string, number> = {};
  const sourceCounts = new Map<SourceId, number>();

  const total = TOTAL_LIMIT[profile];
  let written = 0;
  let overBudget = 0;

  // Budget is spent on breadth before depth. Sorting purely by confidence lets a
  // single bulk deposit-address dump (one exchange ships 350k) swallow the whole
  // snapshot and crowd out every curated pack, which is the opposite of rich.
  // Ordering by pack size ascending guarantees small curated packs land in full;
  // the dumps then consume whatever budget is left. Within a pack, confidence
  // still decides, and the highest-confidence label wins any address collision.
  const packSizes = new Map<string, number>();
  for (const label of collected.labels) {
    const key = `${label.source}/${label.pack}`;
    packSizes.set(key, (packSizes.get(key) ?? 0) + 1);
  }
  const sorted = [...collected.labels].sort((a, b) => {
    const sizeA = packSizes.get(`${a.source}/${a.pack}`) ?? 0;
    const sizeB = packSizes.get(`${b.source}/${b.pack}`) ?? 0;
    if (sizeA !== sizeB) return sizeA - sizeB;
    return b.confidence - a.confidence;
  });

  for (const raw of sorted) {
    if (written >= total) {
      overBudget += 1;
      continue;
    }
    const bucket = addresses[raw.chain];
    if (!bucket) {
      // A loader emitted a chain with no bucket. This used to fall through
      // silently, which is how 167 TRON labels were collected, counted in the
      // console line and then dropped without a word — exactly the failure this
      // script's own reporting exists to prevent.
      unknownChains.set(raw.chain, (unknownChains.get(raw.chain) ?? 0) + 1);
      continue;
    }
    const key = indexKey(raw.chain, raw.address);
    if (key in bucket) continue;

    const actor = raw.actorId != null ? (actorIndex.get(raw.actorId) ?? null) : null;
    const source = sourceIndex.get(raw.source)!;
    const dedupeKey = `${raw.label}|${raw.category}|${actor}|${source}|${raw.pack}|${raw.confidence}|${raw.reference ?? ""}`;

    let index = labelIndex.get(dedupeKey);
    if (index === undefined) {
      index = labels.length;
      labelIndex.set(dedupeKey, index);
      labels.push({
        label: raw.label,
        category: raw.category,
        actor,
        source,
        pack: raw.pack,
        confidence: raw.confidence,
        reference: raw.reference,
      });
    }

    bucket[key] = index;
    written += 1;
    byChain[raw.chain] = (byChain[raw.chain] ?? 0) + 1;
    byCategory[raw.category] = (byCategory[raw.category] ?? 0) + 1;
    sourceCounts.set(raw.source, (sourceCounts.get(raw.source) ?? 0) + 1);
  }

  if (overBudget) {
    skipped.push({
      pack: "(all feeds)",
      reason: `snapshot cap of ${total} addresses for profile "${profile}"`,
      dropped: overBudget,
    });
  }

  // Actors nothing references are dead weight in a committed file.
  const referenced = new Set(
    labels.map((label) => label.actor).filter((value): value is number => value != null),
  );
  const remap = new Map<number, number>();
  const keptActors: Actor[] = [];
  for (const [oldIndex, actor] of actors.entries()) {
    if (!referenced.has(oldIndex)) continue;
    remap.set(oldIndex, keptActors.length);
    keptActors.push(actor);
  }
  for (const label of labels) {
    label.actor = label.actor == null ? null : (remap.get(label.actor) ?? null);
  }

  for (const [chain, dropped] of unknownChains) {
    skipped.push({ pack: `chain:${chain}`, reason: "no address bucket for this chain", dropped });
  }

  return {
    schema: 1,
    profile,
    generatedAt: new Date().toISOString(),
    sources: sourceIds.map((id) => ({
      id,
      title: SOURCES[id].title,
      homepage: SOURCES[id].homepage,
      licence: SOURCES[id].licence,
      attribution: SOURCES[id].attribution,
      version: collected.versions.get(id) ?? null,
      addresses: sourceCounts.get(id) ?? 0,
    })),
    excluded: Object.values(SOURCES)
      .filter((source) => !includedIds.has(source.id))
      .map((source) => ({
        id: source.id,
        title: source.title,
        homepage: source.homepage,
        licence: source.licence,
        reason:
          source.note ??
          (source.redistributable
            ? "Not requested for this build."
            : "No published licence, so redistribution rights are not granted."),
      })),
    actors: keptActors,
    labels,
    counts: { total: written, byChain, byCategory, skipped },
    addresses,
  };
}

/** Renders the diff a reviewer needs when the payload itself is a binary blob:
 *  what changed, by how much, and against which upstream revisions. */
function renderSummary(
  snapshot: Snapshot,
  previous: Snapshot | null,
  packedBytes: number,
): string {
  const delta = (now: number, before: number | undefined) => {
    if (before === undefined) return `${now.toLocaleString("en-US")} (new)`;
    const diff = now - before;
    return `${now.toLocaleString("en-US")}${diff === 0 ? "" : ` (${diff > 0 ? "+" : ""}${diff.toLocaleString("en-US")})`}`;
  };

  const lines = [
    "# Actor label snapshot",
    "",
    "Generated by `npm run sync:labels`. The payload lives in",
    "`actor-labels.json.gz`; this file exists so a change to it is reviewable.",
    "",
    `- **Profile:** ${snapshot.profile}`,
    `- **Built:** ${snapshot.generatedAt}`,
    `- **Packed size:** ${(packedBytes / 1e6).toFixed(2)} MB`,
    `- **Addresses:** ${delta(snapshot.counts.total, previous?.counts.total)}`,
    `- **Distinct labels:** ${delta(snapshot.labels.length, previous?.labels.length)}`,
    `- **Named actors:** ${delta(snapshot.actors.length, previous?.actors.length)}`,
    "",
    "## By chain",
    "",
    "| Chain | Addresses |",
    "| --- | --- |",
    ...Object.entries(snapshot.counts.byChain)
      .sort((a, b) => b[1] - a[1])
      .map(([chain, n]) => `| ${chain.toUpperCase()} | ${delta(n, previous?.counts.byChain[chain])} |`),
    "",
    "## By category",
    "",
    "| Category | Addresses |",
    "| --- | --- |",
    ...Object.entries(snapshot.counts.byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `| ${c} | ${delta(n, previous?.counts.byCategory[c])} |`),
    "",
    "## Sources",
    "",
    "| Source | Licence | Revision | Addresses |",
    "| --- | --- | --- | --- |",
    ...snapshot.sources.map((src) => {
      const before = previous?.sources.find((p) => p.id === src.id);
      return `| [${src.title}](${src.homepage}) | ${src.licence} | \`${src.version ?? "unknown"}\` | ${delta(src.addresses, before?.addresses)} |`;
    }),
    "",
    "## Evaluated and excluded",
    "",
    ...snapshot.excluded.map((e) => `- **${e.title}** (${e.licence}) - ${e.reason}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

/* ------------------------------------------------------------------- run */

async function main() {
  const argv = process.argv.slice(2);
  const args = new Set(argv);
  const dryRun = args.has("--dry");
  const allowUnlicensed = args.has("--allow-unlicensed");

  const profileArg = argv[argv.indexOf("--profile") + 1];
  const profile: Profile =
    argv.includes("--profile") && ["core", "standard", "full"].includes(profileArg)
      ? (profileArg as Profile)
      : "standard";

  console.log(`profile: ${profile}\n`);

  const skipped: Snapshot["counts"]["skipped"] = [];
  const labels: RawLabel[] = [];
  const actors: Actor[] = [];
  const versions = new Map<SourceId, string | null>();

  // `push(...array)` spreads every element as an argument, which overflows the
  // call stack once a feed returns six figures of labels.
  const collect = <T,>(target: T[], source: T[]) => {
    for (const item of source) target.push(item);
  };

  process.stdout.write("- GraphSense TagPacks ... ");
  const graphsense = await loadGraphSense(profile, skipped);
  collect(labels, graphsense.labels);
  collect(actors, graphsense.actors);
  versions.set("graphsense-tagpacks", graphsense.version);
  console.log(
    `${graphsense.labels.length} labels, ${graphsense.actors.length} actors @ ${graphsense.version ?? "?"}`,
  );

  process.stdout.write("- mempool mining pools ... ");
  const pools = await loadMiningPools();
  collect(labels, pools.labels);
  versions.set("mempool-mining-pools", pools.version);
  console.log(`${pools.labels.length} labels @ ${pools.version ?? "?"}`);

  process.stdout.write("- ethereum-lists tokens ... ");
  const elTokens = await loadEthereumListsTokens();
  collect(labels, elTokens.labels);
  versions.set("ethereum-lists-tokens", elTokens.version);
  console.log(`${elTokens.labels.length} labels @ ${elTokens.version ?? "?"}`);

  process.stdout.write("- Trust Wallet token list ... ");
  const twTokens = await loadTrustWalletTokens();
  collect(labels, twTokens.labels);
  versions.set("trustwallet-assets", twTokens.version);
  console.log(`${twTokens.labels.length} labels @ ${twTokens.version ?? "?"}`);

  process.stdout.write("- Trust Wallet TRON ... ");
  const twTron = await loadTrustWalletTron();
  collect(labels, twTron.labels);
  console.log(`${twTron.labels.length} labels`);

  process.stdout.write("- Safe deployments ... ");
  const safe = await loadSafeDeployments();
  collect(labels, safe.labels);
  versions.set("safe-deployments", safe.version);
  console.log(`${safe.labels.length} labels @ ${safe.version ?? "?"}`);

  if (allowUnlicensed) {
    process.stdout.write("- ethereum-lists contracts (unlicensed, opt-in) ... ");
    const lists = await loadEthereumLists(profile, skipped);
    collect(labels, lists.labels);
    versions.set("ethereum-lists-contracts", lists.version);
    console.log(`${lists.labels.length} labels @ ${lists.version ?? "?"}`);
  } else {
    console.log(`- ethereum-lists contracts skipped: ${SOURCES["ethereum-lists-contracts"].note}`);
  }

  const snapshot = buildSnapshot(
    profile,
    { labels, actors, versions },
    skipped,
    new Set(versions.keys()),
  );

  if (snapshot.counts.total < 500) {
    throw new Error(
      `Only ${snapshot.counts.total} addresses survived ingest - refusing to write a snapshot that thin.`,
    );
  }

  const serialised = `${JSON.stringify(snapshot)}\n`;
  const previous = await readFile(OUT_PATH)
    .then((raw) => JSON.parse(gunzipSync(raw).toString("utf8")) as Snapshot)
    .catch(() => null);

  // A build timestamp that ticks every run makes the file byte-different even
  // when no label moved, which would open a weekly "rebuild" pull request with
  // no substantive diff. Compare the data, ignore the clock.
  const unchanged =
    previous !== null &&
    JSON.stringify({ ...previous, generatedAt: "" }) ===
      JSON.stringify({ ...snapshot, generatedAt: "" });

  console.log(
    `\n${snapshot.counts.total} addresses / ${snapshot.labels.length} distinct labels / ${snapshot.actors.length} actors`,
  );
  console.log(
    `by chain: ${Object.entries(snapshot.counts.byChain)
      .map(([chain, count]) => `${chain.toUpperCase()} ${count}`)
      .join(", ")}`,
  );
  console.log(
    `by category: ${Object.entries(snapshot.counts.byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => `${category} ${count}`)
      .join(", ")}`,
  );
  const packed = gzipSync(Buffer.from(serialised, "utf8"), { level: 9 });
  console.log(
    `size: ${(Buffer.byteLength(serialised) / 1e6).toFixed(2)} MB raw, ${(
      packed.length / 1e6
    ).toFixed(2)} MB gzipped`,
  );
  if (previous) {
    const delta = snapshot.counts.total - previous.counts.total;
    console.log(
      `previous: ${previous.counts.total} addresses (${delta >= 0 ? "+" : ""}${delta})`,
    );
  }
  if (skipped.length) {
    const totalDropped = skipped.reduce((sum, entry) => sum + entry.dropped, 0);
    console.log(`\nskipped ${totalDropped} addresses across ${skipped.length} rules:`);
    for (const entry of skipped.slice(0, 12)) {
      console.log(`  ${entry.pack}: ${entry.dropped} - ${entry.reason}`);
    }
    if (skipped.length > 12) console.log(`  ... and ${skipped.length - 12} more`);
  }

  if (unchanged) {
    console.log("\nLabels are identical to the committed snapshot. Leaving it untouched.");
    return;
  }

  if (dryRun) {
    console.log("\n--dry: nothing written.");
    return;
  }

  await mkdir(dirname(OUT_PATH), { recursive: true });
  const temporary = `${OUT_PATH}.tmp`;
  await writeFile(temporary, packed);
  await rename(temporary, OUT_PATH);
  await writeFile(SUMMARY_PATH, renderSummary(snapshot, previous, packed.length), "utf8");
  console.log(
    `\nwrote ${OUT_PATH} (sha256 ${createHash("sha256").update(serialised).digest("hex").slice(0, 16)})`,
  );
  console.log(`wrote ${SUMMARY_PATH}`);
}

main().catch((error: unknown) => {
  console.error(
    `\nlabel sync failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
  );
  process.exitCode = 1;
});
