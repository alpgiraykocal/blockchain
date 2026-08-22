import { NextResponse, type NextRequest } from "next/server";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { analyzeAddress, toGraphFragment } from "@/lib/analysis";
import {
  handleRouteError,
  jsonError,
  parseChain,
  parseLimit,
  parseLocale,
  resolveSubject,
} from "@/lib/api-helpers";
import { getDictionary } from "@/lib/i18n";
import type { GraphEdge, GraphNode } from "@/lib/types";

export const runtime = "nodejs";

/** Returns the node/edge fragment for one expansion step. The client merges
 *  fragments into its own graph state, so expansion stays incremental. */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, RATE_LIMITS.expensive, "graph");
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const chain = parseChain(params.get("chain"));
  if (!chain) return jsonError("Unknown or missing `chain`. Use btc or eth.", 400);

  const raw = params.get("address");
  const limit = parseLimit(params.get("limit"), 40, 120);
  const direction = params.get("direction");
  const maxNeighbors = parseLimit(params.get("maxNeighbors"), 12, 60);

  try {
    const { address, error: unresolved } = await resolveSubject(chain, raw);
    if (unresolved) return unresolved;

    const analysis = await analyzeAddress(
      chain,
      address,
      limit,
      getDictionary(parseLocale(params.get("locale"))).aml,
    );
    const fragment = toGraphFragment(analysis);

    const rootId = fragment.nodes[0]!.id;
    const candidates: GraphEdge[] =
      direction === "in" || direction === "out"
        ? fragment.edges.filter((edge) => edge.direction === direction)
        : fragment.edges;

    // Keep the highest-value counterparties: an unbounded expansion turns the
    // canvas into a hairball long before it becomes more informative.
    const edges = [...candidates]
      .sort((a, b) => b.value.coin - a.value.coin)
      .slice(0, maxNeighbors);

    const keep = new Set<string>([rootId, ...edges.flatMap((e) => [e.source, e.target])]);
    const nodes: GraphNode[] = fragment.nodes.filter((node) => keep.has(node.id));

    return NextResponse.json({
      root: rootId,
      nodes,
      edges,
      // Both figures describe the set this request actually asked for. Measuring
      // them against the unfiltered fragment made a `direction=in` expansion
      // report every outbound counterparty as truncated.
      truncated: candidates.length > edges.length,
      totalNeighbors: candidates.length,
      window: analysis.window,
    });
  } catch (error) {
    return handleRouteError(error, parseLocale(request.nextUrl.searchParams.get("locale")));
  }
}
