import { NextResponse, type NextRequest } from "next/server";
import { analyzeAddress, toGraphFragment } from "@/lib/analysis";
import { getAdapter } from "@/lib/chains";
import {
  handleRouteError,
  jsonError,
  parseChain,
  parseLimit,
  validateAddressParam,
} from "@/lib/api-helpers";
import type { GraphEdge, GraphNode } from "@/lib/types";

export const runtime = "nodejs";

/** Returns the node/edge fragment for one expansion step. The client merges
 *  fragments into its own graph state, so expansion stays incremental. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const chain = parseChain(params.get("chain"));
  if (!chain) return jsonError("Unknown or missing `chain`. Use btc or eth.", 400);

  const raw = params.get("address");
  const limit = parseLimit(params.get("limit"), 40, 120);
  const direction = params.get("direction");
  const maxNeighbors = parseLimit(params.get("maxNeighbors"), 12, 60);

  try {
    const resolved = raw ? await getAdapter(chain).resolve(raw) : null;
    const invalid = validateAddressParam(chain, resolved);
    if (invalid) return jsonError(invalid, 400);

    const analysis = await analyzeAddress(chain, resolved!, limit);
    const fragment = toGraphFragment(analysis);

    const rootId = fragment.nodes[0]?.id;
    let edges: GraphEdge[] = fragment.edges;
    if (direction === "in" || direction === "out") {
      edges = edges.filter((edge) => edge.direction === direction);
    }
    // Keep the highest-value counterparties: an unbounded expansion turns the
    // canvas into a hairball long before it becomes more informative.
    edges = edges
      .sort((a, b) => Number(b.value.coin) - Number(a.value.coin))
      .slice(0, maxNeighbors);

    const keep = new Set<string>([rootId, ...edges.flatMap((e) => [e.source, e.target])]);
    const nodes: GraphNode[] = fragment.nodes.filter((node) => keep.has(node.id));

    return NextResponse.json({
      root: rootId,
      nodes,
      edges,
      truncated: fragment.edges.length > edges.length,
      totalNeighbors: fragment.edges.length,
      window: analysis.window,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
