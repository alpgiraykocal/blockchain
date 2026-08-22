/**
 * English copy for the AML/CTF engine.
 *
 * The detectors, the disposition and the narrative all produce prose that an
 * analyst reads and that ends up in a case file, so it is translated like any
 * other surface. It lives apart from `ui` because the engine is handed only
 * this slice - a detector has no business reaching the navigation labels.
 *
 * Nothing here asserts criminality. Findings are "consistent with" statements,
 * weights order a queue, and every match carries the arguments against it.
 */
export const aml = {
  dispositionLabel: {
    escalate: "Escalate",
    "enhanced-review": "Enhanced review",
    monitor: "Monitor",
    "no-action": "No action",
  },

  stage: {
    placement: "Placement",
    layering: "Layering",
    integration: "Integration",
    unclear: "Stage unclear",
  },

  strength: {
    indicative: "indicative",
    supporting: "supporting",
    weak: "weak",
  },

  basis: {
    observed: "observed",
    derived: "derived",
    attribution: "attribution",
  },

  finding: {
    context: "context",
    noMatch: "no match",
    weight: (n: number) => `weight ${n}`,
    evidence: "Evidence",
    argumentsAgainst: "Arguments against",
  },

  caseFile: {
    title: "Case file",
    description: "Draft narrative, audit trail and export",
    assessmentId: "Assessment id",
    engineLayout: "Engine / layout",
    sanctionsList: "Sanctions list",
    labelSnapshot: "Label snapshot",
    hopTopK: "Hop depth / top-K",
    reductionApplied: "Reduction applied",
    caseFileHeading: (subject: string) => `Case file - ${subject}`,
    chronology: "Chronology",
    dataLimitations: "Data limitations",
    audit: "Audit",
    generated: "Generated",
    explorer: "Explorer",
    sanctionsIssued: (source: string, date: string) => `${source}, issued ${date}`,
    hopTopKValue: (hop: number, topK: number) => `${hop} hop · top ${topK}`,
    reductionNone: "none",
    sourceVersion: (id: string, version: string) => `${id} @ ${version}`,
    versionUnknown: "unknown",
    markdown: "Markdown",
    json: "JSON",
    copyNarrative: "Copy narrative",
    downloadJson: "Download JSON",
  },

  disposition: {
    driver: (title: string, summary: string) => `${title}: ${summary}`,
    noTypology: "No typology matched in the analysed window.",
    mitigantService:
      "The subject is an attributed service. High turnover, convergence and dispersal are its expected operating shape, and structural findings have been de-weighted accordingly.",
    mitigantNoSanctions:
      "No direct or one-hop match against the loaded OFAC snapshot, subject to the snapshot's own coverage limits.",
    mitigantAttributed: (share: string) =>
      `${share} of counterparties are attributed to named actors rather than unknown addresses, which narrows the unexplained surface.`,
    mitigantRetains: (amount: string) =>
      `The address retains ${amount}, which is inconsistent with pure conduit behaviour.`,
    changeWindow:
      "The full transaction history is reviewed. The analysis window is a bounded slice from the block explorer, and a pattern outside it cannot fire a detector.",
    changeSnapshot:
      "The sanctions snapshot is refreshed. It is currently older than the review threshold, so a recent designation may be missing.",
    changeCustomerInfo:
      "Customer information is available. Every structural finding here describes shape only; it becomes meaningful once measured against a stated business profile and expected activity.",
    changeCustodian:
      "The receiving institution supplies the onward record for value that left to a custodian.",
    stepSanctionsHit:
      "Treat as a sanctions hit: stop the activity, confirm the match against the current OFAC list, and route to sanctions counsel for a blocking or rejection determination.",
    stepEscalate: "Escalate to a senior analyst with this case file attached.",
    stepPreserve:
      "Preserve the evidence: export the assessment and record the list and label snapshot versions it was produced against.",
    stepEdd:
      "Apply enhanced due diligence: establish who controls the address and whether the observed activity matches a stated purpose.",
    stepExpand:
      "Expand the network by one hop on the highest-priority counterparties before deciding.",
    stepMonitorRecord:
      "Record the observation and re-check on a defined interval rather than opening a case now.",
    stepMonitorTrigger:
      "Set a trigger for a material change in counterparty mix or transaction size.",
    stepNoAction:
      "No action indicated on the evidence in this window. Document the review so the negative result is auditable.",
    headlineSanctions: "Sanctions list match on the subject address",
    headlineEscalate: "Findings warrant escalation to a senior analyst",
    headlineEdd: "Findings warrant enhanced due diligence before disposition",
    headlineMonitor: "Weak signal only; monitor rather than open a case",
    headlineNoAction: "No pattern of concern in the analysed window",
  },

  risk: {
    abuse: {
      sanctions: "Sanctioned party",
      "terrorism-financing": "Terrorism financing",
      ransomware: "Ransomware",
      theft: "Theft / hack proceeds",
      "darknet-market": "Darknet market",
      mixer: "Mixing service",
      scam: "Scam / fraud",
      none: "No abuse category",
    },
    directLabel: (abuse: string) => `Direct: ${abuse}`,
    directDetailNotes: (label: string, pack: string, notes: string) =>
      `Tagged "${label}" by ${pack}. ${notes}`,
    directDetail: (label: string, pack: string, confidence: number) =>
      `Tagged "${label}" by ${pack} (confidence ${confidence}%).`,
    indirectLabel: (hops: number, abuse: string) => `${hops}-hop exposure: ${abuse}`,
    indirectDetail: (label: string, share: number) =>
      `Counterparty tagged "${label}" holds ${share}% of observed flow.`,
    fanOutLabel: "Fan-out distribution",
    fanOutDetail: (out: number, inn: number) =>
      `${out} receiving counterparties against ${inn} senders — consistent with dispersal or peeling.`,
    fanInLabel: "Fan-in consolidation",
    fanInDetail: (inn: number, out: number) =>
      `${inn} senders funnel into ${out} outputs — consistent with collection or mule aggregation.`,
    oneShotLabel: "Non-repeating counterparties",
    oneShotDetail: (share: number) => `${share}% of counterparties appear exactly once.`,
    knownServiceLabel: "Known service — structural heuristics suppressed",
    knownServiceDetail:
      "Tagged as a known service, where high fan-in and fan-out are expected rather than suspicious.",
    noSignalLabel: "No attribution or structural signal",
    noSignalDetail:
      "No tag matched and no structural heuristic fired in the analysed window.",
  },

  narrative: {
    disclaimer:
      "This narrative was generated from public blockchain data and open attribution sources. It supports human review; it is not a suspicious activity determination and carries no conclusion of law. Figures cover the analysed transaction window only. Attribution and sanctions matches reflect the snapshot versions recorded in the audit block. Final review, filing decisions and any customer action remain with a qualified compliance professional.",
    attributedTo: (label: string) => `attributed to "${label}"`,
    noAttribution: "with no attribution in the loaded label sets",
    subjectPhrase: (chain: string, address: string, label: string) =>
      `${chain} address ${address}, ${label}`,
    firstTx: "First transaction inside the analysed window.",
    lastTx: "Most recent transaction inside the analysed window.",
    largestMovement: (direction: string, amount: string, usd: string, hash: string) =>
      `Largest single movement: ${direction} ${amount}${usd} in transaction ${hash}.`,
    directionIn: "received",
    directionOut: "sent",
    atCurrentRate: (usd: string) => ` (${usd} at the current rate)`,
    dormantObserved: (detail: string) => `Dormant period observed: ${detail}`,
    undated: "Undated",
    reviewCovers: (subject: string) => `This review covers ${subject}.`,
    coSpend: (n: number) =>
      `Co-spend analysis groups the address with ${n} other address(es) under common control.`,
    noCoSpend:
      "No co-spending partner appeared in the window, so the address stands alone as its own entity.",
    consistentWith: (count: number, list: string) =>
      `The activity is consistent with ${count === 1 ? "one recognised pattern" : `${count} recognised patterns`}: ${list}.`,
    noTypologyMatched: "No typology in the detection set matched the activity in this window.",
    volumeLine: (
      windowSize: string,
      windowTotal: string,
      explorer: string,
      received: string,
      inDegree: number,
      sent: string,
      outDegree: number,
    ) =>
      `Across ${windowSize} of ${windowTotal} transactions available from ${explorer}, the address received ${received} from ${inDegree} distinct counterparties and sent ${sent} to ${outDegree}.`,
    headingScope: "Subject and scope",
    subjectLine: (address: string, chain: string) => `Subject: ${address} on ${chain}.`,
    isContract: "The address is a contract.",
    lifetimeFigures: (
      explorer: string,
      received: string,
      sent: string,
      balance: string,
      txCount: string,
    ) =>
      `Lifetime figures reported by ${explorer}: received ${received}, sent ${sent}, current balance ${balance} across ${txCount} transactions.`,
    windowLine: (from: string, to: string, size: string) =>
      `Analysis window: ${from} to ${to}, covering ${size} transactions.`,
    headingActivity: "Observed activity",
    counterpartiesLine: (degree: number, inn: number, out: number, oneShot: string) =>
      `Counterparties: ${degree} distinct (${inn} sending, ${out} receiving). ${oneShot} appear exactly once.`,
    concentrationLine: (share: string) =>
      `Value concentration: the largest single counterparty accounts for ${share} of observed flow.`,
    retentionLine: (share: string) => `Retention: ${share} of everything received has been sent on.`,
    dwellLine: (hours: string) =>
      `Median time between an inbound transaction and the next outbound one is ${hours} hours.`,
    activityLine: (days: number, burst: string) =>
      `Activity spans ${days} distinct day(s); the busiest day carries ${burst}x the mean daily transaction count.`,
    attributionLine: (share: string, services: number) =>
      `${share} of counterparties carry attribution, of which ${services} are known services.`,
    headingWhy: "Why this warrants attention",
    findingLine: (title: string, family: string, stage: string, summary: string, facts: string) =>
      `${title} (${family}, ${stage} stage). ${summary} ${facts}`,
    factLine: (label: string, detail: string) => `${label}: ${detail}`,
    headingAlternatives: "Alternative explanations considered",
    counterLine: (title: string, counter: string) => `${title}: ${counter}`,
    headingNoPattern: "Why no pattern was raised",
    noPatternBody:
      "No detector in the set matched the activity in this window. This is a negative result over a bounded slice of history and over the attribution loaded at the time of review, not a clearance.",
    headingDisposition: "Recommended disposition",
    driversLine: (items: string) => `Drivers: ${items}`,
    mitigantsLine: (items: string) => `Mitigating factors: ${items}`,
    nextStepsLine: (items: string) => `Next steps: ${items}`,
    headingUncertainty: "Residual uncertainty",
    mdChronology: "Chronology",
    mdAudit: "Audit",
  },

  explorerLabelNote: "Public label supplied by the block explorer.",

  /** Why the drawn network is smaller than the measured one. Reduction shapes
   *  what is rendered and every step it takes is reported, so these are read by
   *  an analyst and travel in the assessment payload. */
  reduction: {
    timeWindow: (start: string | null, end: string | null) =>
      `Counterparties with no activity between ${start ?? "the start of the window"} and ${end ?? "now"}.`,
    minValue: (amount: number, ticker: string) =>
      `Counterparties below ${amount} ${ticker} of observed flow.`,
    direction: (direction: "in" | "out") =>
      `Showing ${direction === "in" ? "senders" : "receivers"} only.`,
    serviceHubs:
      "Attributed services are hubs by construction. The three largest by value are kept; the rest are collapsed out of the view but remain in the metrics.",
    topK: (kept: number, total: number) =>
      `Ring 1 limited to the ${kept} highest-priority counterparties of ${total}.`,
    hopTwoCap: (expanded: number, total: number) =>
      `Second hop expanded ${expanded} of ${total} ring-1 nodes. Each expansion is one explorer request, and attributed services are not expanded because their neighbourhoods are unbounded.`,
    hardCap: (maxNodes: number, maxEdges: number) =>
      `Extraction stopped at the ${maxNodes}-node / ${maxEdges}-edge ceiling.`,
    sourceWindow: (analysed: number, total: number) =>
      `Counterparties derive from ${analysed} of ${total} transactions - the explorer's page, not full history.`,
  },

  limitations: {
    window: (analysed: number, total: number, explorer: string) =>
      `Counterparties and timing derive from ${analysed} of ${total} transactions supplied by ${explorer}. A pattern outside that window cannot fire a detector.`,
    clusterPartial:
      "Co-spend clustering sees only the transactions in the window, so the entity may be larger on the full chain.",
    totalsWindowed:
      "Received and sent totals are computed over the window rather than full history on this chain.",
    txsUnavailable: (reason: string) =>
      `The explorer could not serve the transaction list (${reason}); behavioural detectors had no data to run against.`,
    snapshotStale:
      "The sanctions snapshot is older than the seven-day review threshold; a recent designation may be missing.",
    expansionsFailed: (n: number) =>
      `${n} second-hop expansion(s) failed and are absent from the network.`,
    noCustomerInfo:
      "No customer information is in scope. Every structural finding describes shape only and becomes meaningful only against a stated business profile.",
  },

  typology: {
    sanctions: {
      title: "Sanctions exposure",
      family: "Prohibited counterparty",
      evSubjectListed: "Subject is listed",
      evSentTo: (label: string) => `Subject sent value to a listed party: ${label}`,
      evReceivedFrom: (label: string) => `Subject received value from a listed party: ${label}`,
      evSentDetail: (amount: string) => `${amount} sent by the subject to that address.`,
      evReceivedDetail: (amount: string) => `${amount} received by the subject from that address.`,
      amount: (coin: string, txCount: number) => `${coin} across ${txCount} transaction(s)`,
      summaryDirect:
        "The subject address itself appears on an OFAC sanctions list. This is a list match on a published identifier, not a behavioural inference.",
      summaryOutbound: (n: number) =>
        `The subject sent value to ${n} address(es) on an OFAC sanctions list. Value moving to a listed party is a potential prohibited transaction and is treated as the more serious direction.`,
      summaryInboundDust: (n: number) =>
        `The subject received a negligible amount from ${n} listed address(es). Amounts this small are characteristic of dusting, where a listed address sprays tiny sums at unrelated recipients, and the subject may have had no part in it.`,
      summaryInbound: (n: number) =>
        `The subject received value from ${n} address(es) on an OFAC sanctions list.`,
      summaryNone: "No direct or one-hop match against the loaded OFAC snapshot.",
      counterInbound:
        "Inbound value cannot be refused on a public blockchain. Receiving from a listed address is not itself an act by the subject.",
      counterDust:
        "The amount received is negligible, which is the signature of a dusting campaign rather than a funds transfer.",
      counterIdentifier:
        "A list match is an identifier match on a published address. It does not by itself establish the subject's knowledge or intent.",
      counterCoverage:
        "Sanctions screening covers published addresses only. It cannot see addresses a designated party controls but has never had published, nor entities blocked derivatively under the 50 Percent Rule.",
      counterClear:
        "A clear screening result is not a clearance: the snapshot covers published addresses only, and is only as current as its last sync.",
    },

    mixer: {
      title: "Mixing or privacy-service exposure",
      family: "On-chain layering",
      evSubjectIsMixer: "Subject is a mixing service",
      evReceivedFrom: (label: string) => `Received from ${label}`,
      evSentTo: (label: string) => `Sent to ${label}`,
      fallbackLabel: "a mixing service",
      evDetail: (coin: string, txCount: number) => `${coin} across ${txCount} transaction(s).`,
      summaryMatched:
        "Value moved to or from a service whose function is to break the link between source and destination, which is the defining step of on-chain layering.",
      summaryNone:
        "No counterparty in the analysed window is tagged as a mixing or privacy service.",
      counterLawful:
        "Privacy tooling has lawful uses, and using one is not itself an offence in most jurisdictions.",
      counterAttribution:
        "Mixer attribution comes from third-party research, not from a legal designation, unless the sanctions finding also fired.",
    },

    peelChain: {
      title: "Peel chain",
      family: "On-chain layering",
      summaryNotUtxo:
        "Peel-chain detection reads UTXO change structure and does not apply to an account-model chain.",
      summaryMatched: (n: number) =>
        `${n} outbound transactions in the window split into two outputs with one holding at least 80% of the value, the structure a peel chain produces.`,
      summaryNone:
        "No repeated two-output spend pattern consistent with peeling in the analysed window.",
      evRepeated: "Repeated asymmetric two-output spends",
      evRepeatedDetail: (peels: number, total: number) =>
        `${peels} of ${total} analysed transactions.`,
      evExample: "Example",
      evExampleDetail: (hash: string, date: string) => `${hash} on ${date}.`,
      counterOrdinary:
        "Ordinary wallet spending produces the same two-output shape whenever a payment is smaller than the input being spent; change output structure alone does not distinguish the two.",
      counterBatching:
        "Wallets that batch payments or use fixed change policies can generate this pattern continuously without any layering intent.",
    },

    passThrough: {
      title: "Rapid pass-through",
      family: "Mule / conduit behaviour",
      evNothingRetained: "Almost nothing retained",
      evNothingRetainedDetail: (share: string, balance: string) =>
        `${share} of everything received was sent on; the balance now stands at ${balance}.`,
      evShortDwell: "Short dwell time",
      evShortDwellDetail: (hours: string) =>
        `Median ${hours} hours between an inbound transaction and the next outbound one.`,
      evTurnover: "Turnover",
      evTurnoverDetail: (n: string) => `${n} transactions on the address.`,
      summaryMatched:
        "Funds arrive and leave again almost immediately with little retained, which is how a conduit or mule address behaves.",
      summaryNone:
        "Retention and timing do not fit a pass-through conduit in the analysed window.",
      counterCustodial:
        "Custodial sweep wallets, payment processors and consolidation addresses are designed to behave exactly this way.",
      counterWindow:
        "Dwell time is measured over the analysed window only; a longer history could show retention this slice cannot see.",
    },

    funnel: {
      title: "Funnel aggregation",
      family: "Mule / collection network",
      summaryMatched: (inDegree: number, outDegree: number) =>
        `${inDegree} distinct senders converge on this address against ${outDegree} receiver(s), the shape of a collection point.`,
      summaryNone: "Counterparty structure does not converge in the analysed window.",
      evConvergent: "Convergent counterparty structure",
      evConvergentDetail: (ratio: string, degree: number) =>
        `Fan-in ratio ${ratio} across ${degree} counterparties.`,
      evNonRepeating: "Non-repeating senders",
      evNonRepeatingDetail: (share: string) =>
        `${share} of counterparties appear exactly once.`,
      counterByDesign:
        "Merchant settlement, donation addresses, mining payouts and exchange deposit addresses all converge by design.",
      counterProfile:
        "Convergence is only meaningful against a customer profile; without one, it describes structure rather than intent.",
    },

    dispersal: {
      title: "Dispersal",
      family: "Layering",
      summaryMatched: (outDegree: number, inDegree: number) =>
        `Value leaves to ${outDegree} distinct receivers against ${inDegree} sender(s), consistent with breaking a sum into many smaller onward transfers.`,
      summaryNone: "Counterparty structure does not disperse in the analysed window.",
      evDivergent: "Divergent counterparty structure",
      evDivergentDetail: (ratio: string, degree: number) =>
        `Fan-out ratio ${ratio} across ${degree} counterparties.`,
      counterByDesign:
        "Payroll, airdrops, mining pool payouts and exchange withdrawal wallets disperse by design.",
    },

    uniform: {
      title: "Uniform-amount layering",
      family: "Layering",
      summaryTooFew:
        "Too few valued transactions in the window to test for repeated amounts.",
      summaryMatched: (count: number, total: number, amount: string) =>
        `${count} of ${total} valued transactions move approximately the same amount (${amount}), consistent with splitting a sum into uniform slices.`,
      summaryNone: "No dominant repeated transaction amount in the analysed window.",
      evRepeatedSize: "Repeated transfer size",
      evRepeatedSizeDetail: (count: number, amount: string, ticker: string, share: string) =>
        `${count} transactions at approximately ${amount} ${ticker}, ${share} of valued transactions in the window.`,
      counterRecurring:
        "Subscription payments, fixed-price sales, mining payouts and automated rebalancing all produce repeated identical amounts.",
      counterNoThreshold:
        "On-chain transfers face no reporting threshold to structure around; uniformity here is a layering signal, not threshold avoidance.",
    },

    dormant: {
      title: "Dormancy then burst",
      family: "Behavioural change",
      summaryTooFew:
        "Too few timestamped transactions in the window to test for a dormancy break.",
      summaryMatched: (days: number, burst: number) =>
        `The address was inactive for ${days} days, then produced ${burst} transactions within a week of waking.`,
      summaryNone:
        "No long dormancy followed by concentrated activity in the analysed window.",
      evDormant: "Dormant period",
      evDormantDetail: (from: string, to: string, days: number) =>
        `${from} to ${to}, ${days} days.`,
      evWaking: "Activity on waking",
      evWakingDetail: (n: number) => `${n} transactions within seven days.`,
      counterHolders:
        "Long-term holders moving a position, recovered wallets and estate transfers all look like this.",
      counterWindow: "The window may simply begin part-way through a longer pattern.",
    },

    roundTripping: {
      title: "Round-tripping",
      family: "Layering",
      summaryMatched: (n: number) =>
        `Value routed out through ${n} counterparty path(s) that lead back to the subject's own cluster, adding hops without changing beneficial control.`,
      summaryNone: "No path in the extracted network returns to the subject's cluster.",
      evReturnPath: "Return path",
      evReturnPathDetail: (via: string, back: string) =>
        `Out via ${via}, back to cluster member ${back}.`,
      counterWalletOps:
        "Wallet management, consolidation and exchange deposit-withdrawal cycles produce loops without any layering purpose.",
      counterLimited:
        "Detection is limited to the extracted network; a loop through an unexpanded node will not appear.",
    },

    offGraph: {
      title: "Tracing continues off-graph",
      family: "Investigation limit",
      summaryMatched: (share: string) =>
        `${share} of observed outflow reaches a custodian or bridge, where on-chain tracing stops and only the receiving institution can continue it.`,
      summaryNone:
        "No material share of outflow reaches a tagged custodian or bridge in the analysed window.",
      evExit: (label: string) => `Exit point: ${label}`,
      fallbackLabel: "custodial service",
      evExitDetail: (coin: string, txCount: number) =>
        `${coin} across ${txCount} transaction(s).`,
      counterNotRedFlag:
        "This is a limit of the data, not a red flag. Reaching an exchange is ordinary and expected.",
      counterRequest:
        "Continuing past this point requires a request to the receiving institution, not further on-chain analysis.",
    },

    chainHopping: {
      title: "Chain-hopping through bridges",
      family: "Cross-chain layering",
      fallbackLabel: "an attributed bridge",
      summaryMatched: (share: string, venues: number) =>
        venues > 1
          ? `${share} of outbound value went to ${venues} different bridge contracts. Value that crosses a chain leaves the reach of single-chain tracing.`
          : `${share} of outbound value went repeatedly to a bridge contract. Value that crosses a chain leaves the reach of single-chain tracing.`,
      summaryNone: "No concentrated or repeated bridge use in the analysed window.",
      evShare: "Outbound value concentrated into bridges",
      evShareDetail: (share: string, amount: string) =>
        `${share} of what left this address went to bridge contracts, ${amount} in the analysed window.`,
      evVenues: "Repetition and venue",
      evVenuesDetail: (venues: number, transfers: number) =>
        `${venues} distinct bridge${venues === 1 ? "" : "s"} across ${transfers} transfer${transfers === 1 ? "" : "s"}. A single crossing is ordinary and does not reach this finding.`,
      evBridge: (label: string) => `Sent to ${label}`,
      evBridgeDetail: (amount: string, txCount: number) =>
        `${amount} over ${txCount} transfer${txCount === 1 ? "" : "s"}.`,
      counterOrdinary:
        "Bridging to a rollup is routine: users cross constantly for lower fees, and most bridge traffic has no concealment motive whatsoever.",
      counterService:
        "A bridge is a service. Using one says nothing about the intent of the party using it.",
      counterDestination:
        "Tracing does not stop, it moves. The value continues on the destination chain, which this tool does not analyse - so this marks the edge of visibility here, not the end of the trail.",
      counterCoverage:
        "Only bridges present in the loaded attribution are recognised. An unlabelled bridge produces no finding at all, so absence proves nothing.",
    },
    dusting: {
      title: "Inbound dusting",
      family: "Attribution attack / privacy probe",
      summaryMatched: (count: number, share: string) =>
        `${count} senders delivered amounts worth less than it costs to spend them, ${share} of everyone who sent to this address. The pattern is done to an address, not by it.`,
      summaryNone: "No spray of unspendable inbound amounts in the analysed window.",
      summaryNoPrice:
        "No price was available for the analysed window, so inbound amounts could not be tested against an economic dust floor.",
      evSpray: "Spray of unspendable amounts",
      evSprayDetail: (dust: number, inbound: number, share: string) =>
        `${dust} of ${inbound} inbound counterparties sent under 1 USD once and never again (${share}).`,
      evNegligible: "Carrying no value",
      evNegligibleDetail: (share: string) =>
        `Those transfers account for ${share} of inbound value, which is what separates dusting from a service handling small payments.`,
      counterNotConduct:
        "Receiving dust is not conduct by the holder. A sender needs no permission, and the recipient may never have noticed.",
      counterInflates:
        "Dust inflates this subject's counterparty count and fan-in, so degree and any exposure reading above should be read net of it.",
      counterFaucet:
        "Faucets, airdrops, refunds and testing traffic produce the same shape without any attribution motive.",
    },
    serviceDeweighted:
      "The subject is an attributed service, where this structure is the expected operating shape rather than an anomaly.",
  },
};
