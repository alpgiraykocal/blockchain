import { NextResponse, type NextRequest } from "next/server";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { assessAddress } from "@/lib/aml/assess";
import { getAdapter } from "@/lib/chains";
import {
  handleRouteError,
  jsonError,
  parseChain,
  parseLimit,
  parseLocale,
  validateAddressParam,
} from "@/lib/api-helpers";
import { getDictionary } from "@/lib/i18n";

export const runtime = "nodejs";

/** Ego-network extraction plus AML assessment for one subject.
 *
 *  The response is investigation support: typology findings, an explainable
 *  metric set, a triage disposition and a draft case narrative. It is not a
 *  suspicious activity determination. */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, RATE_LIMITS.expensive, "aml");
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const chain = parseChain(params.get("chain"));
  if (!chain) return jsonError("Unknown or missing `chain`. Use btc or eth.", 400);

  const raw = params.get("address");
  const hop = params.get("hop") === "2" ? 2 : 1;
  const topK = parseLimit(params.get("topK"), 12, 40);
  const direction = params.get("direction");
  const minValue = Number(params.get("minValue"));
  const locale = parseLocale(params.get("locale"));

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
      copy: getDictionary(locale).aml,
      locale,
    });

    return NextResponse.json({ assessment, network });
  } catch (error) {
    return handleRouteError(error, parseLocale(request.nextUrl.searchParams.get("locale")));
  }
}
