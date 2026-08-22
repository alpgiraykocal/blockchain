import { NextResponse, type NextRequest } from "next/server";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { getAdapter } from "@/lib/chains";
import { CHAIN_IDS, detectChain, isValidAddress } from "@/lib/chains/registry";
import { builtinTagsFor } from "@/lib/tags";
import { handleRouteError, jsonError, parseLocale } from "@/lib/api-helpers";
import type { ChainId, Tag } from "@/lib/types";

export const runtime = "nodejs";

export interface SearchHit {
  chain: ChainId;
  address: string;
  label: string | null;
  tags: Tag[];
  kind: "address" | "ens";
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, RATE_LIMITS.lookup, "search");
  if (limited) return limited;

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return jsonError("Missing `q` parameter.", 400);

  try {
    const detected = detectChain(query);
    const candidates: ChainId[] = detected ? [detected] : CHAIN_IDS;
    const hits: SearchHit[] = [];

    for (const chain of candidates) {
      if (!isValidAddress(chain, query)) continue;
      const resolved = await getAdapter(chain).resolve(query);
      if (!resolved) continue;
      hits.push({
        chain,
        address: resolved,
        label: null,
        tags: builtinTagsFor(chain, resolved),
        kind: resolved.toLowerCase() === query.toLowerCase() ? "address" : "ens",
      });
    }

    return NextResponse.json({
      query,
      hits,
      hint: hits.length
        ? null
        : "No chain recognised this string. Blockchain Analysis accepts BTC addresses (1…, 3…, bc1…), ETH addresses (0x…) and ENS names.",
    });
  } catch (error) {
    return handleRouteError(error, parseLocale(request.nextUrl.searchParams.get("locale")));
  }
}
