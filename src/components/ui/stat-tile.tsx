import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./primitives";

export function StatTile({
  label,
  value,
  secondary,
  delta,
  icon,
  loading,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  secondary?: ReactNode;
  /** Percentage change; sign drives both the arrow direction and the colour. */
  delta?: number | null;
  icon?: ReactNode;
  loading?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface px-3 py-2.5",
        className,
      )}
      title={hint}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-24" />
      ) : (
        <div className="tnum truncate text-lg font-semibold leading-tight text-foreground">
          {value}
        </div>
      )}
      <div className="flex min-h-4 items-center gap-2 text-[11px] text-foreground-muted">
        {secondary ? <span className="tnum truncate">{secondary}</span> : null}
        {delta != null && !loading ? <DeltaPill delta={delta} /> : null}
      </div>
    </div>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const tone =
    delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-foreground-muted";
  return (
    <span className={cn("tnum inline-flex items-center gap-0.5 font-medium", tone)}>
      <Icon className="size-3" aria-hidden="true" />
      {Math.abs(delta).toFixed(2)}%
    </span>
  );
}
