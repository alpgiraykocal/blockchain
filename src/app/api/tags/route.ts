import { NextResponse, type NextRequest } from "next/server";
import {
  OFAC_SNAPSHOT,
  allOfacTags,
  allPacks,
  builtinTagsFor,
  isSnapshotStale,
  packStats,
  snapshotAgeDays,
} from "@/lib/tags";
import { parseChain } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const subject = params.get("subject");
  const chain = parseChain(params.get("chain"));

  if (subject && chain) {
    return NextResponse.json({ tags: builtinTagsFor(chain, subject) });
  }

  return NextResponse.json({
    packs: packStats(),
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
  });
}
