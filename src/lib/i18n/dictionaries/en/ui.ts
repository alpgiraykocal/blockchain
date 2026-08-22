/**
 * English UI copy.
 *
 * This object is the source of truth for the translation surface: `Dictionary`
 * is derived from its type, so every other locale is checked against it at
 * compile time and a missing or misspelled key fails the build rather than
 * silently rendering `undefined`.
 *
 * Interpolated strings are functions rather than templates with placeholder
 * tokens. That keeps the arguments type-checked and lets each language put the
 * values where its own grammar needs them, which token substitution cannot do.
 */
export const ui = {
  meta: {
    title: "Blockchain Analysis — cryptoasset graph analytics",
    titleTemplate: "%s · Blockchain Analysis",
    description:
      "Interactive address, entity and transaction-flow analysis for Bitcoin and Ethereum, built on public block explorer data.",
  },

  nav: {
    brand: "Blockchain Analysis",
    dashboard: "Dashboard",
    investigate: "Investigate",
    explorer: "Explorer",
    tags: "Tags & risk",
    primaryLabel: "Primary",
    skipToContent: "Skip to main content",
    liveDataTitle: "Live public data",
    liveDataBody:
      "Bitcoin via mempool.space, Ethereum via Blockscout. Clustering and risk scoring run locally over a bounded transaction window.",
  },

  theme: {
    groupLabel: "Colour theme",
    light: "Light",
    dark: "Dark",
    system: "System",
    cycle: (current: string, next: string) =>
      `Colour theme: ${current}. Switch to ${next}.`,
  },

  language: {
    label: "Language",
    switchTo: (name: string) => `Switch language to ${name}`,
  },

  search: {
    placeholder: "Search a BTC or ETH address, or an ENS name",
    placeholderShort: "Search address",
    srLabel: "Search address",
    clear: "Clear search",
    recent: "Recent",
    noMatch: "Nothing matched. Enter a full BTC address, ETH address or ENS name.",
    failed: "Search failed — check your connection and retry.",
  },

  common: {
    retry: "Retry",
    couldNotLoad: "Could not load data",
    loading: "Loading…",
    copy: "Copy",
    copied: "Copied",
    copyAddress: "Copy address",
    table: "Table",
    chart: "Chart",
    showMore: "Show more",
    showLess: "Show less",
    of: "of",
    all: "All",
    none: "None",
    unknown: "Unknown",
    openOn: (explorer: string) => `Open on ${explorer}`,
  },

  home: {
    heading: "Cryptoasset graph analytics",
    lede: "Look up any Bitcoin or Ethereum address to see its balance, counterparties, co-spending cluster and attribution-driven risk — then walk the transaction flow hop by hop in the graph explorer.",
    tagsLoaded: (count: string) => `${count} attribution tags loaded`,
    sanctionsFlagged: (count: string) => `${count} sanctions-flagged`,
    howTitle: "How a review runs",
    howDescription: "Search an address, then work it through the three lenses",
    step: (n: number) => `Step ${n}`,
    steps: {
      investigateTitle: "Investigate",
      investigateBody:
        "Run the assessment: typology findings with their counter-arguments, a triage disposition, and a draft case file with an audit trail.",
      traceTitle: "Trace the flow",
      traceBody:
        "Expand senders and receivers hop by hop, and highlight the shortest path between two addresses.",
      attributionTitle: "Check attribution",
      attributionBody:
        "See which sanctions and actor feeds produced a label, how current they are, and add your own tags.",
    },
    workedExampleBefore: "Every address opens on its report; the investigation and the graph are one click away on the same subject bar. Worked example: ",
    workedExampleLink: "a designated exchange",
    disclaimerLead: "Read the score, not the verdict.",
    disclaimerBody:
      " Clustering and risk are heuristics computed over a bounded transaction window from public explorers. Treat every result as a lead to verify, not as a compliance determination.",
    recentTitle: "Recent lookups",
    recentDescription: "Stored in this browser only",
    recentEmptyTitle: "No lookups yet",
    recentEmptyBody:
      "Addresses you inspect appear here. The list is stored in this browser only and never leaves your device.",
    recentClear: "Clear",
  },

  dashboard: {
    liveFrom: (explorer: string) => `Live from ${explorer}`,
    price: "Price",
    change24h: "24h",
    change24hNone: "24h change n/a",
    blockHeight: "Block height",
    mempool: "Mempool",
    txsToday: "Txs today",
    unconfirmedTxs: "unconfirmed txs",
    last24h: "last 24h",
    avgFee: "Avg fee",
    avgFeeHintBtc: "Mean fee per unconfirmed transaction in the mempool",
    avgFeeHintEth: "Cost of a 21,000-gas transfer at the average gas price",
    seriesBtc: "Median fee rate (1w)",
    seriesEth: "Transactions per day",
    unitBtc: "sat/vB",
    unitEth: "tx",
    statsFailed: "Failed to load chain statistics.",
    chainUnavailable: (chain: string, reason: string) => `${chain} unavailable: ${reason}`,
  },

  address: {
    unknownChain: "Unknown chain",
    metaDescription: (chain: string, addr: string) =>
      `Balance, counterparties, cluster and risk assessment for ${chain} address ${addr}.`,
    notValidTitle: "Not a valid address",
    notValidDetail: (value: string, chain: string) =>
      `"${value}" is not a recognised ${chain} address.`,
    loadFailedTitle: "Could not load this address",
    timeout: (explorer: string) =>
      `${explorer} did not respond in time. Addresses with very large transaction histories regularly exceed what the public API will serve; try the explorer directly.`,
    upstreamStatus: (explorer: string, status: number) => `${explorer} responded ${status}.`,
    unknownError: "Unknown error.",
    openOnExplorer: (addr: string, explorer: string) => `Open ${addr}... on ${explorer}`,
    contract: "Contract",
    untagged: "Untagged address",
    openInvestigation: "Open investigation",
    balance: "Balance",
    totalReceived: "Total received",
    totalSent: "Total sent",
    windowOnly: "Computed over the analysed window only",
    transactions: "Transactions",
    countersUnavailable: "counterparties unavailable",
    degrees: (senders: number, receivers: number) =>
      `${senders} senders · ${receivers} receivers`,
    txListUnavailableTitle: "Transaction list unavailable",
    txListUnavailableBody: (explorer: string, reason: string) =>
      `${explorer} could not serve this address's transactions (${reason}). Balance, lifetime totals and attribution above are complete; counterparties, clustering and degree counts are not available for this load. Reload to retry, or open the address on ${explorer}.`,
    riskSummary: "Risk summary",
    riskSummaryDescription: (signals: number, hops: number) =>
      `${signals} signal${signals === 1 ? "" : "s"} · exposure depth ${hops} hop${hops === 1 ? "" : "s"}`,
    noSignal: "No signal",
    noSignalDetail: "No tag matched and no structural heuristic fired in the analysed window.",
    furtherSignals: (n: number) =>
      `${n} further signal${n === 1 ? "" : "s"} contributed to this score.`,
    investigationLink: "Open the investigation",
    investigationLinkAfter:
      " for the typology findings behind this score, the arguments against each one, and a recommended disposition.",
    entityTitle: "Entity / cluster",
    addressCount: (n: string, raw: number) => `${n} address${raw === 1 ? "" : "es"}`,
    entityId: "Entity id",
    firstLastSeen: "First / last seen",
    coSpendingMembers: "Co-spending members",
    accountIdentityNote:
      "Account-model chains expose no co-spend signal, so one address is treated as one entity until an analyst merges them.",
    noCoSpendNote:
      "No co-spending partner appeared in the analysed window, so this address stands alone as its own entity.",
    clusterMultiInput: "Derived with the multi-input (co-spend) heuristic over the analysed window.",
    clusterAccount: "Account model — one address, one entity.",
    clusterNone: "No clustering rule produced a merge for this address.",
    concentrationTitle: "Counterparty concentration",
    concentrationDescription: "Top flows by value in the analysed window",
    inbound: "Inbound",
    outbound: "Outbound",
    txPanelDescription: (n: number) =>
      `${n} transaction${n === 1 ? "" : "s"} in the analysed window`,
    windowTitle: "Bounded analysis window",
    windowPulled: (analysed: number, total: string, explorer: string) =>
      `${analysed} of ${total} transactions were pulled from ${explorer}.`,
    windowTotalsWindowed: " Received and sent totals are computed over that window, not the full history.",
    windowTotalsFull: " Balance and lifetime totals come from the explorer and cover the full history.",
    windowClusterPartial: " Clustering only sees co-spends inside the window, so the entity may be larger on the full chain.",
  },

  investigate: {
    metaTitle: "Investigate",
    metaDescription:
      "Open an AML/CTF investigation on a Bitcoin or Ethereum address: ego-network analysis, typology findings, triage disposition and a draft case file.",
    heading: "Investigate",
    lede: "Runs an ego-network extraction around one subject, tests the activity against a set of named money-laundering typologies, and drafts a case file with the evidence and the arguments against it.",
    chooseSubject: "Choose a subject",
    chooseSubjectBody:
      "Enter the address under review. The assessment covers the transaction window the block explorer will serve, and says so wherever it draws a conclusion.",
    workedExamples: "Or open a worked example",
    exampleLazarusHint: "Sanctions match on the subject. Expect escalation and a hard stop.",
    exampleSuexHint: "Designated exchange with a large co-spend cluster.",
    exampleBinanceHint: "Attributed service. Structural findings are expected and de-weighted.",
    disclaimer:
      "Output supports human review. Typology matches are “consistent with” findings, priority scores order a queue, and nothing here establishes that anyone committed an offence. Filing decisions and customer action remain with a qualified compliance professional.",
  },

  investigation: {
    headline: (addr: string) => `Investigation · ${addr}`,
    assessmentFailed: "Could not run the assessment",
    running: "Extracting the ego network and running the typology set…",
    contract: "Contract",
    untagged: "Untagged address",
    noTxTitle: "No transaction data — the assessment below is incomplete",
    noTxBody: (explorer: string, reason: string) =>
      `${explorer} could not serve this address's transactions (${reason}). Balance and attribution are still accurate; the ego network, every metric and every behavioural detector had nothing to run against, so an absent finding here means absent data, not a clear result.`,
    triagePriority: (priority: number) =>
      `Triage priority ${priority}/100. This orders an analyst's queue; it is not a suspicious activity determination and does not trigger a filing.`,
    drivers: "Drivers",
    mitigants: "Mitigating factors",
    nextSteps: "Recommended next steps",
    noneRecorded: "None recorded.",
    wouldChange: "What would change this recommendation",
    counterparties: "Counterparties",
    inOut: (inn: number, out: number) => `${inn} in · ${out} out`,
    received: "Received",
    sent: "Sent",
    retained: "Retained",
    passedOn: (share: string) => `${share} passed on`,
    retainedHint: "Share of everything received that is still held",
    medianDwell: "Median dwell",
    dwellSecondary: "inbound to next outbound",
    burst: "Burst",
    activeDays: (n: number) => `${n} active day(s)`,
    burstHint: "Busiest day against the mean daily transaction count",
    findingsTitle: "Typology findings",
    findingsDescription: (matched: number, context: number, clear: number) =>
      `${matched} matched · ${context} contextual · ${clear} not matched`,
    notMatched: (n: number) => `${n} typologies tested and not matched`,
    egoNetwork: "Ego network",
    networkDescription: (nodes: number, edges: number, hop: number) =>
      `${nodes} nodes · ${edges} links · ${hop} hop`,
    hop1: "1 hop",
    hop2: "2 hops",
    dirBoth: "Both",
    dirIn: "In",
    dirOut: "Out",
    topK: "Top-K",
    hubsShown: "Hubs shown",
    hubsDamped: "Hubs damped",
    nothingToDraw: "No counterparties to draw",
    nothingUpstream: (explorer: string) =>
      `${explorer} could not serve the transaction list, so there are no counterparties to place around the subject. Retry above.`,
    nothingDirection: (direction: string) =>
      `No ${direction} counterparties in the analysed window. Switch the direction filter back to Both.`,
    directionSending: "sending",
    directionReceiving: "receiving",
    nothingEmptyWindow: (analysed: number) =>
      `The subject has no counterparties in the ${analysed} transaction(s) the explorer returned. This is an empty window, not a cleared address.`,
    rerunning: "Re-running…",
    nodeSummary: (ring: number, priority: number, risk: number, value: string, tx: number) =>
      `Ring ${ring} · priority ${priority} · risk ${risk} · ${value} over ${tx} tx`,
    legendSubject: "Subject",
    legendRing1: "Ring 1 = direct counterparties",
    legendRing2: "Ring 2 = one hop further",
    legendHub: "Service hub, damped",
    legendHighRisk: "High risk",
    reductionApplied: (steps: string) =>
      `Reduction applied: ${steps}. The drawn network is a filtered view; metrics above are computed on the unreduced set.`,
    expansionsFailed: (n: number) =>
      `${n} expansion(s) failed and are missing from the network.`,
    counterpartiesDescription: "Text equivalent of the network, ordered by triage priority",
    colPriority: "Priority",
    colPriorityHint: "Composite of risk, value share and recency. Triage aid only.",
    colRing: "Ring",
    colCounterparty: "Counterparty",
    colDirection: "Dir",
    colValue: "Value",
    colTxs: "Txs",
    colRisk: "Risk",
    badgeService: "service",
    badgeIn: "in",
    badgeOut: "out",
    tableCaption: "Counterparties in the extracted ego network",
  },

  tags: {
    metaTitle: "Tags & risk",
    metaDescription:
      "Browse the loaded attribution TagPacks, manage your own local tags, and read how the risk score is derived.",
    heading: "Tags & risk",
    lede: "Attribution is what turns an anonymous address into an actor. Blockchain Analysis ships with public TagPacks and lets you layer your own tags on top — both feed the same risk model.",
    packsTitle: "Loaded TagPacks",
    packsDescription: (tags: string, packs: number) => `${tags} tags across ${packs} packs`,
    by: (creator: string) => `by ${creator}`,
    autoSynced: "auto-synced",
    daysOld: (days: number) => `${days}d old`,
    tagCount: (n: string) => `${n} tags`,
    abuseCount: (n: string) => `${n} abuse`,
    lastModified: (date: string) => `Last modified ${date}`,
    source: "source",
    scoreTitle: "How the risk score works",
    scoreDescription: "Deterministic, explainable, and always shown with its signals",
    step1Lead: "1. Direct attribution.",
    step1Body:
      " A tag on the address itself contributes its abuse weight scaled by the tag's confidence. Sanctions saturate the score at 100.",
    step2Lead: "2. Exposure by hop.",
    step2Body:
      " A tagged counterparty contributes the same weight decayed by 0.55 per hop, then scaled by that counterparty's share of the observed flow.",
    step3Lead: "3. Structural heuristics.",
    step3Body:
      " Fan-in, fan-out and non-repeating-counterparty patterns lift a clean address into the medium band — they never push it into high on their own.",
    step4Lead: "4. The maximum wins.",
    step4Body:
      " Signals do not stack into a sum, so one strong finding cannot be diluted by many weak ones.",
    bandsCaption: "Risk score bands",
    colScore: "Score",
    colLevel: "Level",
    colMeaning: "Meaning",
    levelClear: "Clear",
    levelLow: "Low",
    levelMedium: "Medium",
    levelHigh: "High",
    levelSevere: "Severe",
    bandClear: "No attribution matched and no structural heuristic fired.",
    bandLow: "Weak or distant signal — worth noting, not acting on.",
    bandMedium: "Structural pattern or a decayed multi-hop exposure.",
    bandHigh: "Strong direct attribution or close exposure to an abuse category.",
    bandSevere: "Sanctions match or equivalent — a hard stop, not a score.",
    staleTitle: (days: number) => `Sanctions snapshot is ${days} days old`,
    staleBodyBefore: "OFAC publishes on business days. Re-run ",
    staleBodyAfter:
      " before relying on a clear result — an absent designation in a stale snapshot is not a clearance.",
    ofacTitle: "OFAC sanctions snapshot",
    ofacDescription:
      "Pulled straight from the OFAC Sanctions List Service — no hand-maintained sanctions data",
    screenable: (n: string) => `${n} screenable`,
    fieldSource: "Source",
    fieldIssued: "List issued",
    fieldRetrieved: "Retrieved",
    fieldAddresses: "Addresses in file",
    fileLine: (mb: string, addresses: string) => `${mb} MB · ${addresses} addresses`,
    byCurrency: "By currency",
    currencyScreened: "Screened by Blockchain Analysis",
    currencyStored: "Stored in the snapshot; no adapter for this chain yet",
    topProgrammes: "Top programmes",
    hitNote:
      "A hit is an exact identifier match on a published address. It does not cover addresses controlled by a designated party but never published, nor entities blocked derivatively under the 50 Percent Rule — neither is derivable from this file.",
    ofacDesignated: "Designated party",
    ofacColProgramme: "Programme",
    ofacColType: "Type",
    ofacColDesignated: "Designated",
    ofacFilter: "Filter by party, address, programme or chain",
    ofacCaption: "OFAC-designated digital currency addresses on supported chains",
    ofacNoMatch: "No match",
    ofacNoMatchBody:
      "Nothing in the current snapshot matches that filter. A miss here is not a clearance — screen the address against the live list before acting.",
    feedsTitle: "Open label feeds",
    feedsDescription: "Actor attribution from public sources",
    feedsPanelDescription:
      "Exchange, mining pool, DeFi and service attribution, rebuilt from public repositories",
    feedsNoSnapshot: "No label snapshot on disk",
    feedsNoSnapshotBefore: ". Run ",
    feedsNoSnapshotAfter:
      " to build it. Sanctions screening is unaffected — that feed is bundled separately.",
    feedsProfile: (profile: string) => `profile: ${profile}`,
    feedsAddresses: (n: string) => `${n} addresses`,
    feedsAddressesLabel: "addresses",
    feedsRevision: "revision",
    feedsUnknown: "unknown",
    feedsCoverage: "Coverage",
    feedsTotals: (chains: string, labels: string, actors: string, built: string) =>
      `${chains} · ${labels} distinct labels · ${actors} named actors · built ${built}`,
    feedsExcluded: (title: string) => `Excluded: ${title}`,
    feedsLicence: (licence: string) => `(licence: ${licence})`,
    feedsTopActors: "Most-labelled actors",
    feedsNote:
      "Actor labels describe who an address belongs to. They carry a confidence weight from the publishing feed and never set an abuse category on their own — a service being large or opaque is not, by itself, a risk finding. Sanctions come from OFAC alone.",
    yourTags: "Your tags",
    yourTagsDescription: "Stored in this browser only — never uploaded anywhere.",
    exportName: "Blockchain Analysis local analyst tags",
    allRemoved: "All local tags removed.",
    confirmDeleteAll: "Confirm delete all",
    deleteAll: "Delete all",
    localTagsCaption: "Analyst tags stored locally",
    noLocalTags: "No local tags yet",
    noLocalTagsBody:
      "Add an attribution below, or import a TagPack JSON export. Local tags override nothing — they sit alongside the loaded packs.",
    colTag: "Tag",
    colAddress: "Address",
    colChain: "Chain",
    colAbuse: "Abuse",
    colConfidence: "Confidence",
    colAdded: "Added",
    deleteTag: (label: string) => `Delete tag ${label}`,
    deleted: (label: string) => `Deleted "${label}".`,
    imported: (n: number) => `Imported ${n} tags.`,
    importFailed: (reason: string) => `Import failed: ${reason} Fix the file and try again.`,
    importUnreadable: "the file could not be read.",
    importAction: "Import",
    exportAction: "Export",
    addTag: "Add a tag",
    addTagDescription: "Attribution you record while working a case",
    formChain: "Chain",
    formLabel: "Label",
    formLabelPlaceholder: "e.g. Acme Exchange deposit",
    formAddress: "Address",
    formActorCategory: "Actor category",
    formConfidence: (pctValue: number) => `Confidence — ${pctValue}%`,
    formNotes: "Notes",
    formNotesHelper: "Optional context for the case file.",
    formNotesPlaceholder: "Where the attribution came from, ticket reference, …",
    formSubmit: "Add tag",
    formSaved: "Tag saved to this browser",
    formAddressRequired: "Enter the address this tag applies to.",
    formLabelRequired: "Give the tag a label an analyst will recognise.",
    formLabelHint: "Shown on the graph node and in every table.",
    formAddressHint: "The address or entity this attribution belongs to.",
    formAbuseType: "Abuse type",
    formAbuseHint: "Drives the risk score.",
    formConfidenceHint: "Scales how strongly the tag moves the score.",
  },

  graph: {
    metaTitle: "Graph explorer",
    metaDescription:
      "Expand address and entity counterparties one hop at a time and trace transaction flow across Bitcoin and Ethereum.",
    heading: "Graph explorer",
    headingHint:
      "Click to select, double-click to expand. Every expansion pulls one hop of counterparties from live explorer data.",
    exampleExchangeHint: "Exchange hub - dense fan-out of labelled counterparties.",
    exampleDefiHint: "DeFi router - contract attribution from the open feeds.",
    exampleSanctionedHint: "OFAC-sanctioned - severe risk and a large co-spend cluster.",
    inspector: "Inspector",
    flowDescription: (nodes: number, links: number, expanded: number) =>
      `${nodes} nodes · ${links} links · ${expanded} expanded`,
    dismiss: "Dismiss",
    flowTitle: "Transaction flow",
    adjacencyTitle: "Adjacency list",
    adjacencyDescription: "Text equivalent of the canvas — sortable and screen-reader friendly.",
    canvasLabel: "Transaction flow graph. Use the adjacency table below for a text equivalent.",
    radialLabel: "Radial ego network. The counterparty table below carries the same data as text.",
    noNodeSelected: "No node selected",
    noNodeSelectedBody:
      "Click a node on the canvas to inspect its attribution, balance and risk signals. Double-click to expand it.",
    pathAnchorSet: "Path anchor set",
    setPathAnchor: "Set path anchor",
    inOutDegree: "In / out degree",
    inOutDegreeHint: "Distinct counterparties in the analysed window",
    lastActivity: "Last activity",
    counterpartyRisk: "Counterparty risk",
    adjacencyCaption: "Adjacency list of every edge currently on the graph canvas",
    noLinks: "No links on the canvas yet",
    noLinksBody:
      "Search an address to seed the graph, then expand a node to pull in its counterparties.",
    legendAddress: "Address",
    legendExchange: "Exchange",
    legendUntagged: "Untagged",
    legendHighRiskRing: "High risk ring",
    legendFocus: "Focus node",
    investigationMetaDescription:
      "AML/CTF investigation workspace: ego-network analysis, typology findings, triage disposition and a draft case file.",
    investigationMetaTitle: (ticker: string, addr: string) => `Investigation · ${ticker} ${addr}`,
    legendEntity: "Entity (cluster)",
    legendMixer: "Mixer / sanctioned",
    legendService: "Service / DeFi",
    expansionFailed: "Expansion failed.",
  },

  transactions: {
    netEffect: "Net effect",
    txVolume: "Tx volume",
    txVolumeHint: "Total value moved by the transaction, across all outputs",
    ioHint: "Number of inputs and outputs in the transaction",
    caption: "Transactions in the analysed window",
    empty: "No transactions in the analysed window",
    emptyBody: "This address has no transaction history the upstream explorer could return.",
  },

  subject: {
    reportHint: "Balances, cluster, transactions",
    investigationHint: "Typologies, disposition, case file",
    graphHint: "Free-form expansion",
    viewsLabel: "Subject views",
    report: "Report",
    investigation: "Investigation",
    graph: "Graph",
  },

  flow: {
    noSenders: "No senders observed",
    noReceivers: "No receivers observed",
    noneBody: "No counterparty of this direction appeared in the analysed transaction window.",
  },

  chart: {
    noSeries: "No series data",
    noSeriesBody: "The upstream explorer did not return a history for this metric.",
  },

  errors: {
    notFound: "Not found on the upstream explorer.",
    rateLimited: "Upstream rate limit reached. Wait a few seconds and retry.",
    upstreamFailed: "Upstream explorer request failed.",
    timeout: "Upstream request timed out.",
    unexpected: "Unexpected server error.",
    rateLimitTitle: "Rate limit reached.",
    rateLimitDetail: (limit: number, retryAfter: number) =>
      `This deployment proxies free public block explorers and limits callers to ${limit} requests per minute. Retry in ${retryAfter}s.`,
    unknownChain: "Unknown or missing `chain`. Use btc or eth.",
    notJsonObject: "File is not a JSON object.",
  },

  notFound: {
    title: "Page not found",
    bodyBefore: "That route does not exist. Addresses live at ",
    bodyAfter: ".",
    back: "Back to dashboard",
  },
};
