"use client";

import { useT } from "@/lib/i18n/context";
import type { NodeKind } from "@/lib/types";

const KINDS = [
  { kind: "address", key: "legendAddress", className: "bg-node-address" },
  { kind: "entity", key: "legendEntity", className: "bg-node-entity" },
  { kind: "exchange", key: "legendExchange", className: "bg-node-exchange" },
  { kind: "mixer", key: "legendMixer", className: "bg-node-mixer" },
  { kind: "service", key: "legendService", className: "bg-node-service" },
  { kind: "unknown", key: "legendUntagged", className: "bg-node-unknown" },
] as const satisfies readonly { kind: NodeKind; key: string; className: string }[];

export function GraphLegend() {
  const t = useT().ui.graph;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-foreground-muted">
      {KINDS.map(({ kind, key, className }) => (
        <span key={kind} className="inline-flex items-center gap-1.5">
          <span className={`size-2.5 rounded-full ${className}`} aria-hidden="true" />
          {t[key]}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-full border-2 border-destructive"
          aria-hidden="true"
        />
        {t.legendHighRiskRing}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rotate-45 border-2 border-ring" aria-hidden="true" />
        {t.legendFocus}
      </span>
    </div>
  );
}
