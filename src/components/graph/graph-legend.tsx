import type { NodeKind } from "@/lib/types";

const KINDS: { kind: NodeKind; label: string; className: string }[] = [
  { kind: "address", label: "Address", className: "bg-node-address" },
  { kind: "entity", label: "Entity (cluster)", className: "bg-node-entity" },
  { kind: "exchange", label: "Exchange", className: "bg-node-exchange" },
  { kind: "mixer", label: "Mixer / sanctioned", className: "bg-node-mixer" },
  { kind: "service", label: "Service / DeFi", className: "bg-node-service" },
  { kind: "unknown", label: "Untagged", className: "bg-node-unknown" },
];

export function GraphLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-foreground-muted">
      {KINDS.map(({ kind, label, className }) => (
        <span key={kind} className="inline-flex items-center gap-1.5">
          <span className={`size-2.5 rounded-full ${className}`} aria-hidden="true" />
          {label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-full border-2 border-destructive"
          aria-hidden="true"
        />
        High risk ring
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rotate-45 border-2 border-ring" aria-hidden="true" />
        Focus node
      </span>
    </div>
  );
}
