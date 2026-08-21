import { NextResponse, type NextRequest } from "next/server";
import { getAdapter } from "@/lib/chains";
import { CHAIN_IDS } from "@/lib/chains/registry";
import { handleRouteError, parseChain } from "@/lib/api-helpers";
import type { ChainStats } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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

    return NextResponse.json({ stats, failures });
  } catch (error) {
    return handleRouteError(error);
  }
}
