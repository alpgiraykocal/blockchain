# Blockchain Analysis

Cryptoasset graph analytics for Bitcoin, Ethereum and TRON — address and entity lookup,
transaction-flow exploration, co-spend clustering, attribution TagPacks and an
explainable risk score.

The concepts (address → entity → tag → link) follow the
[GraphSense](https://graphsense.org/documentation.html) open-source analytics
platform. This app differs in where the data comes from: instead of a Cassandra +
Spark ingest pipeline, it reads **live public block explorers** and runs the
clustering and scoring locally over a bounded transaction window.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4 with semantic design tokens, light + dark |
| Graph | Cytoscape.js + fCoSE force layout |
| Charts | Recharts, each with a table equivalent |
| Client data | SWR |
| Client state | Zustand (graph canvas, local analyst tags) |

## Data sources

| Purpose | Source | Key required |
|---|---|---|
| Bitcoin chain data | [mempool.space](https://mempool.space/docs/api/rest) (Esplora API) | no |
| Ethereum chain data | [Blockscout](https://eth.blockscout.com/api-docs) v2 REST | no |
| Sanctions | [OFAC Sanctions List Service](https://sanctionslistservice.ofac.treas.gov) | no (User-Agent required) |
| Actor attribution | [GraphSense TagPacks](https://github.com/graphsense/graphsense-tagpacks), [mempool mining pools](https://github.com/mempool/mining-pools) | no |

No API keys, no accounts, no database. Responses are cached in-process for 45–60s
and concurrent requests for the same key are de-duplicated, which keeps the app
comfortably inside both providers' rate limits.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

```bash
npm run build        # production build
npm run lint         # eslint
npm run sync:ofac    # refresh the OFAC sanctions snapshot
npm run sync:labels  # rebuild actor attribution from the open feeds
```

## What it does

### Dashboard (`/`)
Live chain tips, spot price, mempool/throughput and fee levels for both chains,
plus a fee-rate and transaction-count trend. Recent lookups are stored in
`localStorage` and never leave the browser.

### Graph explorer (`/explorer`)
Seed the canvas with an address, then expand counterparties one hop at a time
(all, senders only, or receivers only). Node colour encodes the actor category,
the border ring encodes risk, and size scales with the log of transaction count.
Set a path anchor and select a second node to highlight the shortest path between
them. Every edge on the canvas is mirrored into a sortable adjacency table, so the
same data is available without reading the graph.

### Address report (`/address/[chain]/[address]`)
Balance and lifetime totals, the co-spending cluster, attribution tags, the full
risk breakdown, inbound/outbound flow concentration, and the transaction list with
the signed net effect on the address.

### Investigate (`/investigate/[chain]/[address]`)
The AML/CTF workspace. It extracts the ego network around one subject, tests the
activity against named money-laundering typologies, recommends a triage
disposition, and drafts a case file with an audit block.

* **Ego network, not the whole graph.** One subject at the centre, direct
  counterparties in ring one, an opt-in second hop in ring two. Reduction runs in
  a fixed order - time window, minimum value, direction, service-hub damping,
  top-K - and every step it took is printed under the canvas. A graph that
  silently dropped half its edges is worse than no graph.
* **Deterministic radial layout.** Positions are computed, not simulated. A
  force-directed layout puts the same network somewhere different every run,
  which is unusable when two analysts discuss one picture or a screenshot goes
  into a case file.
* **Explainable metrics only.** Degree, in/out volume, retention, median dwell,
  burst, concentration, one-shot ratio. Every figure is a count, a ratio or a
  median an analyst can re-derive by hand. Nothing is fitted or learned.
* **Every finding carries its own rebuttal.** A typology match lists the facts
  that support it and the ordinary explanations that fit just as well. Findings
  are tagged `observed`, `derived` or `attribution` so inference never blurs into
  observation.
* **Known services are de-weighted, not hidden.** Fan-in, fan-out and rapid
  turnover are what an exchange looks like. Where the subject is an attributed
  service, structural findings stay visible but lose their weight and say why.
* **Audit block on every assessment.** Subject, filters, window, reduction
  applied, engine and layout version, and the exact sanctions publication and
  label-snapshot revisions it ran against - so a conclusion can be reproduced or
  challenged later. Exports as Markdown or JSON.

Typologies tested: sanctions exposure, mixing-service exposure, peel chain, rapid
pass-through, funnel aggregation, dispersal, uniform-amount layering, dormancy
then burst, round-tripping, and off-graph continuation (which is a tracing limit,
not a red flag).

**What it is not.** Priority scores order a queue. Typology matches are
"consistent with" findings. Nothing in the output establishes that anyone
committed an offence, and filing decisions and customer action remain with a
qualified compliance professional.

### Tags & risk (`/tags`)
The OFAC snapshot with its full provenance (list issue date, file hashes, counts
by currency and programme), a filterable table of every screenable designated
address, the curated actor TagPacks, and your own local attributions with JSON
import/export. Local tags are persisted in `localStorage` only — the same
guarantee the GraphSense dashboard makes about analyst annotations.

## Sanctions data

Sanctions attribution is **not hand-maintained**. It is pulled from OFAC's
Sanctions List Service and written to an immutable local snapshot:

```bash
npm run sync:ofac              # fetch, validate, write the snapshot
npm run sync:ofac -- --dry     # parse and report, write nothing
npm run sync:ofac -- --force   # override the delta-ceiling guard
```

The script ([`scripts/sync-ofac.mts`](scripts/sync-ofac.mts)) downloads
`SDN_ADVANCED.XML` and `CONS_ADVANCED.XML`, extracts every
`Digital Currency Address - *` feature, and writes
[`src/lib/tags/generated/ofac-crypto.json`](src/lib/tags/generated/ofac-crypto.json)
with the party name, party type, list, programme tags, designation date, OFAC uid,
each file's `DateOfIssue` and SHA-256, and the retrieval timestamp.

Why this shape:

* **The snapshot is committed and screening runs against it.** SLS is a file
  distribution service with no SLA and poor latency — it must never sit on a
  request path. A committed snapshot also means any determination is reproducible
  against the exact list state that produced it.
* **Reference IDs are resolved from the file, not hardcoded.** Feature types,
  lists, programmes and scripts all come from the `ReferenceValueSets` block of
  the same file version. OFAC adds values; a hardcoded map mislabels silently.
* **Poison-pill guards.** The script refuses a response under 100 KB, a file
  missing the expected sections, a total under 200 addresses, or a drop of more
  than 20% against the previous snapshot. A silently truncated parse produces a
  clean run with zero hits — the worst possible failure mode here.
* **Currencies beyond the screenable chains are stored, not discarded.** XMR,
  SOL and the rest sit in the snapshot so adding a chain adapter needs no
  re-sync — which is exactly how TRON went live: the 276 TRON designations were
  already on disk and only needed a currency mapped to a chain. USDT is routed by
  address shape rather than by its currency code, because OFAC lists the same
  token on several chains and 78 of those entries are TRON accounts against 8
  Ethereum ones.
* **Staleness is surfaced, not assumed away.** OFAC publishes on business days;
  the tags screen warns once the snapshot passes seven days.
  [`.github/workflows/sync-ofac.yml`](.github/workflows/sync-ofac.yml) runs the
  sync every weekday and opens a PR when the list changed, so a designation — or
  a **de**listing — gets reviewed rather than silently applied.

Matching is exact on the address, with only the case-folding each chain actually
permits — Ethereum hex and Bitcoin bech32 are case-insensitive, Bitcoin base58 is
not, and folding it would risk a match OFAC never published.

**What a clear result does not mean.** The file lists published addresses only. It
does not cover addresses controlled by a designated party but never published, nor
entities blocked derivatively under the 50 Percent Rule — OFAC does not publish
ownership chains, so that cannot be derived here. It produces a screening
lead, not a compliance determination.

> Why this replaced the hand-written seed pack: the original bundled list asserted
> that the Tornado Cash contracts were OFAC-designated. They were subsequently
> delisted, and a hardcoded copy would still be reporting them as blocked. The
> first live sync removed them automatically.

## Actor attribution

Who an address belongs to - exchanges, mining pools, DeFi protocols, custodians -
comes from open-licensed label feeds, rebuilt by a script rather than typed by
hand:

```bash
npm run sync:labels                      # standard profile (default): everything
npm run sync:labels -- --profile core    # ~20k addresses, for constrained deploys
npm run sync:labels -- --dry             # parse and report, write nothing
```

[`scripts/sync-labels.mts`](scripts/sync-labels.mts) writes
`data/actor-labels.json.gz`. The current standard snapshot carries **428,452
addresses across 13,563 labels and 477 named actors** - exchanges, mining pools,
mixers, gambling, DeFi, tokens and custodial services, on BTC and ETH. The TRON
addresses in it are sanctions designations rather than actor labels.
[`data/actor-labels.summary.md`](data/actor-labels.summary.md) is regenerated
beside it with the counts, per-source deltas and upstream revisions.

### Feeds

| Feed | Licence | What it gives |
|---|---|---|
| [GraphSense TagPacks](https://github.com/graphsense/graphsense-tagpacks) | MIT | Exchange reserve and deposit wallets, mining pools, DeFi protocol deployments, wallet services, plus an actor registry with names, homepages and jurisdictions |
| [mempool mining pools](https://github.com/mempool/mining-pools) | MIT | Bitcoin pool payout addresses and coinbase tags |
| [ethereum-lists tokens](https://github.com/ethereum-lists/tokens) | MIT | ERC-20 contracts with project names and homepages |
| [Trust Wallet assets](https://github.com/trustwallet/assets) | MIT | Curated list of the major Ethereum tokens; higher trust than the long tail, so it wins address collisions |
| [Safe deployments](https://github.com/safe-global/safe-deployments) | MIT | Canonical Safe singletons and proxy factories, published by the protocol team and verifiable on chain |

Blockscout's own public metadata is read live per address on top of these, so
Ethereum picks up explorer-side labels without any ingest.

### Evaluated and excluded

Every excluded feed is recorded in the snapshot with its reason, and the tags
screen renders them, so the gaps in coverage are visible rather than implied.

| Feed | Why not |
|---|---|
| [ethereum-lists/contracts](https://github.com/ethereum-lists/contracts) | ~200k contract-to-project labels and the adapter is written, but the repository publishes **no licence**. Redistributing it in a committed snapshot is not a call this project can make. Pass `--allow-unlicensed` if you have cleared it yourself. |
| [Dune Spellbook](https://github.com/duneanalytics/spellbook) | Large curated CEX and entity label sets, but the Business Source License is source-available rather than open source and restricts production use. |
| [Open Labels Initiative](https://github.com/openlabelsinitiative/OLI) | MIT and purpose-built for exactly this, but bulk access moved from a downloadable export to public BigQuery tables, which would put credentials on the ingest path. Its own docs also call the raw label pool untrusted until the planned trust layer ships. Worth revisiting. |
| Scraped explorer label dumps | An MIT wrapper around scraped data does not grant rights to the data. |

### Design notes

* **Read from disk, not imported.** At tens of megabytes, inlining the snapshot
  into the server bundle would inflate build output and cold starts for data that
  only ever needs a point lookup. `next.config.ts` traces the file into the
  standalone output instead.
* **Dictionary-compressed.** Label strings repeat tens of thousands of times
  across a feed, so addresses point at indices into shared label and actor
  tables. 250k addresses fit in ~12 MB rather than ~60 MB.
* **Stored gzipped.** The payload compresses better than 2:1, which halves what
  every changed snapshot costs the repository forever. Gunzip adds about 40ms
  once per process, against a JSON parse that costs four times that. The cost of
  a binary payload is reviewability, which the regenerated summary file pays back.
* **Breadth before depth.** A single exchange publishes 350k deposit addresses.
  Filling a budget by confidence alone let that one feed swallow the whole
  snapshot - 146 distinct labels for 250k addresses. Packs are filled
  smallest-first instead, so every curated pack lands in full and bulk dumps take
  whatever is left. That ordering is what makes the `core` profile useful rather
  than one exchange's deposit list; `standard` is uncapped and takes everything.
* **Attribution is not accusation.** Actor labels never set an abuse category.
  Abuse-tagged entries in the upstream packs are skipped outright: sanctions are
  a legal determination and come from OFAC alone, not from third-party forensic
  research mixed into the same score.
* **Category specificity matters.** `organization` is the most common category in
  the actor registry and means nothing behaviourally. A specific category always
  outranks it, otherwise every exchange and protocol flattens into "unknown".
* **A missing category is not a missing label.** Requiring a mappable category
  silently dropped 8,453 Ethereum labels from one pack that carried names but no
  category. A label still answers "who is this", which is the question the graph
  asks, so those now land as `unknown` and keep their name.
* **Structural heuristics are suppressed for known services.** Fan-in and fan-out
  is the normal shape of an exchange, pool or casino. Mixers are excluded from
  that suppression, because there the structure is the point.

[`.github/workflows/sync-labels.yml`](.github/workflows/sync-labels.yml) rebuilds
the snapshot weekly and opens a PR, so both new and disappearing labels get
reviewed.

Both sync workflows can write to this repository, so their actions are pinned to
full commit SHAs rather than mutable tags, and Dependabot raises those pins from
the version comment beside each one.

## Deployment

The app is server-rendered with Node-runtime API routes; there is no static
export. `next.config.ts` builds a `standalone` bundle, which is the shape this
workload wants: one long-lived process parses the 10 MB label snapshot once and
shares the upstream cache across requests, where a serverless runtime pays both
costs per instance and per-instance rate limiting counts separately.

```bash
npm run build && npm start        # or: docker compose up -d --build
curl localhost:3000/api/health
```

`postbuild` copies the static assets beside the standalone server and `start`
runs it with node, because `next start` does not serve a standalone build. That
matters for hosting platforms, which run exactly `npm run build && npm start`.

`GET /api/health` returns `ok`, or `207 degraded` when the sanctions snapshot is
stale or the label snapshot is missing - the app still serves, but a screening
result produced against stale data is worth surfacing to whoever runs it.

### Memory

The label snapshot is held in memory: 428k addresses parse to roughly 55 MB of
heap and stay resident for the life of the process. On a 512 MB instance that
leaves usable but not generous headroom, so `NODE_OPTIONS` caps the old space -
without it Node sizes its heap against the host rather than the container and
gets OOM-killed instead of collecting.

If an instance that small does start restarting under load, the fix is to build
the snapshot with the smaller profile rather than to add instances:

```bash
npm run sync:labels -- --profile core   # ~20k addresses instead of 428k
```

Adding instances would not help anyway: the rate limiter counts in-process, so
each one carries its own allowance and multiplies the ceiling that keeps traffic
off the public block explorers.

### Behind Cloudflare

Point a tunnel at the container and the origin never needs a public port:

```bash
cloudflared tunnel create blockchain-analysis
cloudflared tunnel route dns blockchain-analysis blockchain.alpgiraykocal.com
cloudflared tunnel run --url http://127.0.0.1:3000 blockchain-analysis
```

The rate limiter reads `cf-connecting-ip` first, so limits apply per visitor
rather than to the tunnel. API responses carry `s-maxage`, so Cloudflare absorbs
repeat traffic instead of passing it to the explorers.

**Cloudflare Workers and Pages are not a drop-in target.** The label snapshot is
read from disk with `node:fs` and parses to roughly 55 MB of heap, against a
128 MB isolate limit shared with the framework. Running there means moving the
snapshot behind a static-asset fetch or KV and looking addresses up without
holding the whole map in memory - a data-layer change, not a config flag.

### What publishing turns on

* **Rate limiting** on every API route: 20/min for assessment and graph
  expansion, 60/min for lookups, 120/min for cached data. Every route here
  proxies a free public explorer, and without a limit all of that traffic reaches
  mempool.space and Blockscout from one address - a courtesy problem before it is
  an availability one. The counter is in-process: exact on one instance,
  proportionally looser if you run several.
* **A strict Content-Security-Policy** with a per-request nonce, set in
  `src/proxy.ts`. Next emits inline hydration scripts, so `script-src 'self'`
  alone ships a site that renders and then does nothing; `'unsafe-inline'` would
  make the directive decorative. The nonce is why the pages render per request
  rather than being prerendered - Next cannot stamp one onto HTML built at
  compile time.
* **`robots.txt` excluding `/api/`, `/address/` and `/investigate/`.** Those are
  one route per address, an unbounded crawl surface where every hit becomes an
  upstream request.

## Analytics

### Clustering

* **Bitcoin — multi-input (co-spend) heuristic.** Addresses that sign inputs of the
  same transaction are assumed to share one controller. Only co-spends that
  actually involve the address under analysis are merged, so an unrelated
  co-spend in the same page cannot pull in a foreign cluster. Coinbase inputs are
  skipped. The canonical cluster id is the lexicographically smallest member, so
  ids are stable between runs.
* **Ethereum — account identity.** The account model exposes no co-spend signal, so
  one address is one entity until an analyst merges them by hand.

### Risk score (0–100)

1. **Direct attribution** — a tag on the address contributes its abuse weight
   scaled by the tag's confidence. Sanctions saturate at 100.
2. **Exposure by hop** — a tagged counterparty contributes the same weight decayed
   by `0.55` per hop, then scaled by that counterparty's share of observed flow.
3. **Structural heuristics** — fan-in, fan-out and non-repeating-counterparty
   patterns lift a clean address into the medium band. They are suppressed for
   addresses tagged as a known service, where those shapes are normal.
4. **The maximum wins** — signals do not sum, so one strong finding cannot be
   diluted by many weak ones.

Every score is shown with the signals that produced it. See `src/lib/risk.ts`.

### Bounded analysis window

Explorers return a page of transactions, not full history. Anything derived from
that page — clusters, degrees, counterparty flows, and on Ethereum the
received/sent totals — covers the window only, and the UI says so on every report
rather than presenting partial data as complete. Balances and Bitcoin lifetime
totals come from the explorer and cover full history.

**Treat every result as a lead to verify, not a compliance determination.**

## Project layout

```
src/
  app/
    api/{address,graph,stats,search,tags}/   REST endpoints
    address/[chain]/[address]/               address report (server-rendered)
    explorer/                                graph canvas
    tags/                                    TagPack browser + local tag manager
  components/
    graph/       cytoscape canvas, legend, inspector, adjacency table
    charts/      trend chart, flow bars
    ui/          buttons, panels, badges, data table, stat tiles
    dashboard/   chain stat cards, recent lookups
  lib/
    aml/         ego-network extraction, metrics, typologies, disposition, narrative
    chains/      per-chain explorer adapters behind one interface
    tags/        OFAC snapshot, open-feed loader, curated fallback, local tags
data/
  actor-labels.json.gz     generated actor attribution, read at runtime via fs
  actor-labels.summary.md  human-readable counts and deltas for the above
scripts/
  sync-ofac.mts    OFAC SLS ingest -> src/lib/tags/generated/ofac-crypto.json
  sync-labels.mts  open label feeds -> data/actor-labels.json
  sources.mts      feed registry: licences, category and confidence mapping
    analysis.ts  bundle → address/entity/neighbours/graph fragment
    risk.ts      scoring engine
```

### Adding a chain

Implement `ChainAdapter` (`src/lib/chains/adapter.ts`), register it in
`src/lib/chains/index.ts` and add its metadata plus address pattern to
`src/lib/chains/registry.ts`. Everything above the adapter — analysis, graph,
risk, UI — is chain-agnostic.

## Design system

Generated with the UI/UX Pro Max design intelligence pass and persisted in
[`design-system/blockchain-analysis/MASTER.md`](design-system/blockchain-analysis/MASTER.md):
Data-Dense Dashboard style, Fira Sans / Fira Code, blue data with amber
highlights, light and dark defined together as semantic tokens in
`src/app/globals.css`.

Accessibility choices worth knowing:
* Risk level is never carried by colour alone — each level pairs a hue with its
  own icon shape and the numeric score.
* Every chart ships a table alternative; the graph ships an adjacency list.
* Touch targets are ≥44px, focus rings are visible, and `prefers-reduced-motion`
  disables layout and chart animation.

## Attribution data

Both attribution layers are generated, not hand-written: sanctions with
`npm run sync:ofac`, actor labels with `npm run sync:labels`. A small curated pack
in `src/lib/tags/builtin.ts` remains as a fallback for the case where the label
snapshot is missing, and is suppressed for any address a synced feed already
knows. Add your own attribution on top through the Tags screen, or point the sync
script at further TagPacks.
