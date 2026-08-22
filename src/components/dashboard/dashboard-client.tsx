"use client";

import useSWR from "swr";
import { ChainStatsCard } from "./chain-stats-card";
import { ErrorState, Panel } from "@/components/ui/primitives";
import { jsonFetcher } from "@/lib/fetcher";
import { useT } from "@/lib/i18n/context";
import type { ChainStats } from "@/lib/types";

interface StatsResponse {
  stats: ChainStats[];
  failures: { chain: string; reason: string }[];
}

export function DashboardClient() {
  const t = useT().ui.dashboard;
  // Chain tips move every few minutes; a 90s refresh keeps the tiles honest
  // without hammering the public explorers.
  const { data, error, mutate } = useSWR<StatsResponse>("/api/stats", jsonFetcher, {
    refreshInterval: 90_000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  if (error && !data) {
    return (
      <Panel>
        <ErrorState
          detail={error instanceof Error ? error.message : t.statsFailed}
          onRetry={() => void mutate()}
        />
      </Panel>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index} className="skeleton h-[380px] rounded-lg" aria-hidden="true" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-2">
        {data.stats.map((stats) => (
          <ChainStatsCard key={stats.chain} stats={stats} />
        ))}
      </div>
      {data.failures.length ? (
        <p role="status" className="text-[11px] text-warning">
          {t.chainUnavailable(
            data.failures.map((failure) => failure.chain.toUpperCase()).join(", "),
            data.failures.map((failure) => failure.reason).join("; "),
          )}
        </p>
      ) : null}
    </div>
  );
}
