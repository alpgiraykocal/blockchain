import { NextResponse } from "next/server";
import { isSnapshotStale, snapshotAgeDays, snapshotIssuedAt } from "@/lib/tags/ofac";
import { hasLabelSnapshot, labelSnapshot, labelSnapshotError } from "@/lib/tags/actors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness and data-freshness probe for the host's health check.
 *
 *  Reports degraded rather than failing when a snapshot is stale or missing:
 *  the app still serves, but a screening result produced against stale
 *  sanctions data is worth surfacing to whoever runs the deployment. */
export async function GET() {
  const labels = labelSnapshot();
  const labelsMissing = !hasLabelSnapshot();
  const sanctionsStale = isSnapshotStale();

  const status = labelsMissing || sanctionsStale ? "degraded" : "ok";

  return NextResponse.json(
    {
      status,
      uptimeSeconds: Math.round(process.uptime()),
      sanctions: {
        issued: snapshotIssuedAt(),
        ageDays: snapshotAgeDays(),
        stale: sanctionsStale,
      },
      labels: {
        loaded: !labelsMissing,
        addresses: labels.counts.total,
        generatedAt: labels.generatedAt,
        error: labelSnapshotError(),
      },
    },
    {
      status: status === "ok" ? 200 : 207,
      headers: { "cache-control": "no-store" },
    },
  );
}
