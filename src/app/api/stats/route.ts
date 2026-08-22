import { NextResponse, type NextRequest } from "next/server";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { getAdapter } from "@/lib/chains";
import { CHAIN_IDS } from "@/lib/chains/registry";
import { handleRouteError, parseChain, parseLocale } from "@/lib/api-helpers";
import type { ChainStats } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, RATE_LIMITS.cheap, "stats");
  if (limited) return limited;

  const requested = parseChain(request.nextUrl.searchParams.get("chain"));
  const chains = requested ? [requested] : CHAIN_IDS;

  try {
    // One slow explorer must not blank the whole dashboard.
    const settled = await Promise.allSettled(
      chains.map((chain) => getAdapter(chain).getStats()),
    );

    const stats: ChainStats[] = [];
    const failures: { chain: string; reason: string }[] = [];
    settled.forEach((result, index) => {
      if (result.status === "fulfilled") stats.push(result.value);
      else failures.push({ chain: chains[index], reason: String(result.reason) });
    });

    if (!stats.length) throw settled[0]?.status === "rejected" ? settled[0].reason : new Error("No stats");

    return NextResponse.json(
      { stats, failures },
      {
        // Chain tips move every few minutes. Letting a CDN serve the same
        // payload for a minute keeps a burst of visitors off the explorers.
        headers: { "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120" },
      },
    );
  } catch (error) {
    return handleRouteError(error, parseLocale(request.nextUrl.searchParams.get("locale")));
  }
}
