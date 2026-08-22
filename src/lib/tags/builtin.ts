import type { TagPack } from "../types";

/** Seed attribution data, modelled on the public GraphSense TagPack format.
 *
 *  Sanctions data is NOT here. It is generated from OFAC's Sanctions List Service
 *  by `npm run sync:ofac` into `generated/ofac-crypto.json` — see `ofac.ts`.
 *  Hand-maintaining sanctions entries is how a list goes stale: the Tornado Cash
 *  addresses this file used to carry were delisted, and a hardcoded copy would
 *  still be reporting them as blocked.
 *
 *  What remains below is actor attribution (exchanges, pools, protocols) drawn
 *  from published addresses. Swap in your own TagPacks via the Tags screen. */

const now = "2026-01-01T00:00:00.000Z";

export const BUILTIN_PACKS: TagPack[] = [
  {
    id: "public-exchanges",
    title: "Public exchange hot wallets",
    creator: "Blockchain Analysis seed",
    description:
      "Widely published custodial hot-wallet addresses. Useful as flow termination points — funds reaching them leave the transparent graph.",
    lastmod: now,
    tags: [
      {
        id: "ex-binance-btc",
        chain: "btc",
        subject: "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
        label: "Binance cold wallet",
        category: "exchange",
        abuse: "none",
        confidence: 0.95,
        source: "tagpack",
        pack: "public-exchanges",
        createdAt: now,
      },
      {
        id: "ex-bitfinex-btc",
        chain: "btc",
        subject: "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97",
        label: "Bitfinex hot wallet",
        category: "exchange",
        abuse: "none",
        confidence: 0.9,
        source: "tagpack",
        pack: "public-exchanges",
        createdAt: now,
      },
      {
        id: "ex-kraken-eth",
        chain: "eth",
        subject: "0x2910543Af39abA0Cd09dBb2D50200b3E800A63D2",
        label: "Kraken hot wallet",
        category: "exchange",
        abuse: "none",
        confidence: 0.9,
        source: "tagpack",
        pack: "public-exchanges",
        createdAt: now,
      },
      {
        id: "ex-binance-eth",
        chain: "eth",
        subject: "0x28C6c06298d514Db089934071355E5743bf21d60",
        label: "Binance 14",
        category: "exchange",
        abuse: "none",
        confidence: 0.95,
        source: "tagpack",
        pack: "public-exchanges",
        createdAt: now,
      },
    ],
  },
  {
    id: "l1-bridges",
    title: "L1 bridge contracts",
    creator: "Blockchain Analysis seed",
    description:
      "Ethereum mainnet entry points for rollup and cross-chain bridges. Every address below was checked against Blockscout and carries its own `Bridge` public tag there, so the attribution has a second source rather than resting on this file alone. Candidates that did not carry that tag were left out, including ones whose contract name looked right.",
    lastmod: now,
    tags: [
      {
        id: "br-arbitrum-inbox",
        chain: "eth",
        subject: "0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f",
        label: "Arbitrum One: Delayed Inbox",
        category: "bridge",
        abuse: "none",
        confidence: 0.9,
        source: "tagpack",
        pack: "l1-bridges",
        createdAt: now,
        notes: "Blockscout public tag: Bridge.",
      },
      {
        id: "br-arbitrum-gateway",
        chain: "eth",
        subject: "0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef",
        label: "Arbitrum One: L1 Gateway Router",
        category: "bridge",
        abuse: "none",
        confidence: 0.9,
        source: "tagpack",
        pack: "l1-bridges",
        createdAt: now,
        notes: "Blockscout public tag: Bridge.",
      },
      {
        id: "br-optimism-l1",
        chain: "eth",
        subject: "0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1",
        label: "Optimism: L1 Standard Bridge",
        category: "bridge",
        abuse: "none",
        confidence: 0.9,
        source: "tagpack",
        pack: "l1-bridges",
        createdAt: now,
        notes: "Blockscout public tag: Bridge.",
      },
      {
        id: "br-polygon-root",
        chain: "eth",
        subject: "0xA0c68C638235ee32657e8f720a23ceC1bFc77C77",
        label: "Polygon PoS: Root Chain Manager",
        category: "bridge",
        abuse: "none",
        confidence: 0.9,
        source: "tagpack",
        pack: "l1-bridges",
        createdAt: now,
        notes: "Blockscout public tag: Bridge.",
      },
      {
        id: "br-wormhole-token",
        chain: "eth",
        subject: "0x3ee18B2214AFF97000D974cf647E7C347E8fa585",
        label: "Wormhole: Token Bridge",
        category: "bridge",
        abuse: "none",
        confidence: 0.9,
        source: "tagpack",
        pack: "l1-bridges",
        createdAt: now,
        notes: "Blockscout public tag: Bridge; verified contract name TokenBridge.",
      },
    ],
  },
  {
    id: "known-services",
    title: "Known services and protocols",
    creator: "Blockchain Analysis seed",
    description: "Bridges, DeFi routers and mining pools that commonly appear as graph hubs.",
    lastmod: now,
    tags: [
      {
        id: "svc-uniswap",
        chain: "eth",
        subject: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        label: "Uniswap V2 Router",
        category: "defi",
        abuse: "none",
        confidence: 1,
        source: "tagpack",
        pack: "known-services",
        createdAt: now,
      },
      {
        id: "svc-f2pool",
        chain: "btc",
        subject: "1KFHE7w8BhaENAswwryaoccDb6qcT6DbYY",
        label: "F2Pool",
        category: "mining-pool",
        abuse: "none",
        confidence: 0.9,
        source: "tagpack",
        pack: "known-services",
        createdAt: now,
      },
    ],
  },
];
