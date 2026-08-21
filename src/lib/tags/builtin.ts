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
