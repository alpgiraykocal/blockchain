"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Table2, TrendingUp } from "lucide-react";
import { Button, EmptyState } from "@/components/ui/primitives";
import { formatDate, formatNumber } from "@/lib/format";
import type { TimePoint } from "@/lib/types";

/** Time series with a built-in table alternative — a chart alone is not a
 *  screen-reader-accessible representation of the data. */
export function TrendChart({
  points,
  label,
  unit,
  loading,
  color = "var(--secondary)",
  height = 200,
}: {
  points: TimePoint[];
  label: string;
  unit: string;
  loading?: boolean;
  color?: string;
  height?: number;
}) {
  const [asTable, setAsTable] = useState(false);

  const data = useMemo(() => {
    if (!points.length) return [];
    // A series spanning less than three days needs clock labels, not dates —
    // otherwise every tick reads the same.
    const first = new Date(points[0].t).getTime();
    const last = new Date(points[points.length - 1].t).getTime();
    const intraday = Math.abs(last - first) < 3 * 24 * 60 * 60 * 1000;

    return points.map((point) => ({
      t: point.t,
      v: point.v,
      short: new Date(point.t).toLocaleString("en-GB", 
        intraday
          ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
          : { day: "2-digit", month: "short" },
      ),
    }));
  }, [points]);

  const summary = useMemo(() => {
    if (!data.length) return null;
    const values = data.map((point) => point.v);
    const first = values[0];
    const last = values[values.length - 1];
    const change = first === 0 ? 0 : ((last - first) / first) * 100;
    return {
      first,
      last,
      min: Math.min(...values),
      max: Math.max(...values),
      change,
    };
  }, [data]);

  if (loading) return <div className="skeleton w-full" style={{ height }} aria-hidden="true" />;

  if (!data.length) {
    return (
      <EmptyState
        icon={<TrendingUp className="size-5" aria-hidden="true" />}
        title="No series data"
        description="The upstream explorer did not return a history for this metric."
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-foreground-muted">
          {summary ? (
            <span className="tnum">
              {formatNumber(summary.last)} {unit} now · range {formatNumber(summary.min)}–
              {formatNumber(summary.max)} {unit}
            </span>
          ) : null}
        </p>
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={asTable}
          onClick={() => setAsTable((current) => !current)}
        >
          <Table2 className="size-3.5" aria-hidden="true" />
          {asTable ? "Chart" : "Table"}
        </Button>
      </div>

      {asTable ? (
        <div className="max-h-56 overflow-y-auto rounded border border-border">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{label} over time</caption>
            <thead className="sticky top-0 bg-surface-2">
              <tr>
                <th scope="col" className="px-2 py-1.5 font-semibold text-foreground-muted">
                  Date
                </th>
                <th scope="col" className="px-2 py-1.5 text-right font-semibold text-foreground-muted">
                  {unit}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((point) => (
                <tr key={point.t} className="border-t border-border/70">
                  <td className="px-2 py-1">{formatDate(point.t, false)}</td>
                  <td className="tnum px-2 py-1 text-right">{formatNumber(point.v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <figure className="m-0">
          <figcaption className="sr-only">
            {label}: {summary ? `${formatNumber(summary.first)} to ${formatNumber(summary.last)} ${unit}` : ""}
          </figcaption>
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id={`fill-${label.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="short"
                tick={{ fontSize: 10, fill: "var(--foreground-muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--foreground-muted)" }}
                tickLine={false}
                axisLine={false}
                width={54}
                tickFormatter={(value: number) => formatNumber(value, true)}
              />
              <Tooltip
                cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.t ? formatDate(payload[0].payload.t) : ""
                }
                formatter={(value) => [`${formatNumber(Number(value))} ${unit}`, label] as [string, string]}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                fill={`url(#fill-${label.replace(/\W/g, "")})`}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </figure>
      )}
    </div>
  );
}
