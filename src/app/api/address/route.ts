import { NextResponse, type NextRequest } from "next/server";
import { analyzeAddress } from "@/lib/analysis";
import { getAdapter } from "@/lib/chains";
import {
  handleRouteError,
  jsonError,
  parseChain,
  parseLimit,
  validateAddressParam,
} from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const chain = parseChain(params.get("chain"));
  if (!chain) return jsonError("Unknown or missing `chain`. Use btc or eth.", 400);

  const raw = params.get("address");
  const limit = parseLimit(params.get("limit"), 50);

  try {
    const resolved = raw ? await getAdapter(chain).resolve(raw) : null;
    const invalid = validateAddressParam(chain, resolved);
    if (invalid) return jsonError(invalid, 400);

    const analysis = await analyzeAddress(chain, resolved!, limit);
    return NextResponse.json(analysis, {
      headers: { "cache-control": "private, max-age=30" },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
