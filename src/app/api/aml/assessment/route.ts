import { NextResponse, type NextRequest } from "next/server";
import { assessAddress } from "@/lib/aml/assess";
import { getAdapter } from "@/lib/chains";
import {
  handleRouteError,
  jsonError,
  parseChain,
  parseLimit,
  validateAddressParam,
} from "@/lib/api-helpers";

export const runtime = "nodejs";

/** Ego-network extraction plus AML assessment for one subject.
 *
 *  The response is investigation support: typology findings, an explainable
 *  metric set, a triage disposition and a draft case narrative. It is not a
 *  suspicious activity determination. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const chain = parseChain(params.get("chain"));
  if (!chain) return jsonError("Unknown or missing `chain`. Use btc or eth.", 400);

  const raw = params.get("address");
  const hop = params.get("hop") === "2" ? 2 : 1;
  const topK = parseLimit(params.get("topK"), 12, 40);
  const direction = params.get("direction");
  const minValue = Number(params.get("minValue"));

  try {
    const resolved = raw ? await getAdapter(chain).resolve(raw) : null;
    const invalid = validateAddressParam(chain, resolved);
    if (invalid) return jsonError(invalid, 400);

    const { assessment, network } = await assessAddress(chain, resolved!, {
      hopDepth: hop as 1 | 2,
      topK,
      direction: direction === "in" || direction === "out" ? direction : "both",
      minValueCoin: Number.isFinite(minValue) && minValue > 0 ? minValue : 0,
      suppressServiceHubs: params.get("hubs") !== "all",
      windowStart: params.get("from"),
      windowEnd: params.get("to"),
    });

    return NextResponse.json({ assessment, network });
  } catch (error) {
    return handleRouteError(error);
  }
}
