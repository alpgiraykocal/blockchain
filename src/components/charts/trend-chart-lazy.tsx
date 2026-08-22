"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { TrendChart } from "./trend-chart";

/**
 * `TrendChart` behind a deferred import.
 *
 * Recharts is 355 KB raw / ~102 KB over the wire - about 40% of the dashboard's
 * initial JavaScript - for two charts that sit below the fold and cannot render
 * until `/api/stats` resolves anyway. Loading it with the page delays hydration
 * of the search field, which is the one thing a visitor wants immediately.
 *
 * `ssr: false` because the chart has no server-rendered value here: its data
 * arrives client-side through SWR, so a server pass would only emit the same
 * placeholder. The placeholder reserves the caller's exact height, so swapping
 * the real chart in shifts nothing.
 */
const LazyTrendChart = dynamic(
  () => import("./trend-chart").then((module) => module.TrendChart),
  { ssr: false },
);

export function TrendChartLazy(props: ComponentProps<typeof TrendChart>) {
  return (
    <div style={{ minHeight: props.height ?? 200 }}>
      <LazyTrendChart {...props} />
    </div>
  );
}
