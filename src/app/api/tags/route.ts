import { NextResponse, type NextRequest } from "next/server";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import {
  OFAC_SNAPSHOT,
  allOfacTags,
  allPacks,
  builtinTagsFor,
  isSnapshotStale,
  packStats,
  snapshotAgeDays,
} from "@/lib/tags";
import { parseChain, parseLocale } from "@/lib/api-helpers";
import { getDictionary } from "@/lib/i18n";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, RATE_LIMITS.cheap, "tags");
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const subject = params.get("subject");
  const chain = parseChain(params.get("chain"));

  if (subject && chain) {
    return NextResponse.json({ tags: builtinTagsFor(chain, subject) });
  }

  const body = {
    packs: packStats(getDictionary(parseLocale(params.get("locale"))).ui.packs),
    // Provenance travels with the data: a consumer must be able to tell which
    // list version a screening result was produced against.
    sanctionsSnapshot: {
      source: OFAC_SNAPSHOT.source,
      retrievedAt: OFAC_SNAPSHOT.retrievedAt,
      files: OFAC_SNAPSHOT.files,
      counts: OFAC_SNAPSHOT.counts,
      ageDays: snapshotAgeDays(),
      stale: isSnapshotStale(),
    },
    tags: [...allOfacTags(), ...allPacks().flatMap((pack) => pack.tags)],
  };

  return NextResponse.json(body, {
    // Snapshot data only changes when a sync lands, so it caches well.
    headers: { "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
