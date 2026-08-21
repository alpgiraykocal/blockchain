import { AlertOctagon, AlertTriangle, CircleAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { RISK_LEVEL_LABEL } from "@/lib/risk";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Risk is never carried by colour alone — every level pairs a hue with its own
 *  icon shape and the numeric score. */
const LEVEL_STYLE: Record<RiskLevel, { className: string; Icon: typeof ShieldCheck }> = {
  clear: { className: "border-success/40 bg-success/10 text-success", Icon: ShieldCheck },
  low: { className: "border-info/40 bg-info/10 text-info", Icon: ShieldQuestion },
  medium: { className: "border-warning/45 bg-warning/10 text-warning", Icon: CircleAlert },
  high: { className: "border-destructive/45 bg-destructive/10 text-destructive", Icon: AlertTriangle },
  severe: { className: "border-destructive bg-destructive/20 text-destructive", Icon: AlertOctagon },
};

export function RiskBadge({
  level,
  score,
  size = "md",
  className,
}: {
  level: RiskLevel;
  score: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const { className: tone, Icon } = LEVEL_STYLE[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
        tone,
        className,
      )}
      title={`Risk ${RISK_LEVEL_LABEL[level]} — score ${score}/100`}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden="true" />
      <span>{RISK_LEVEL_LABEL[level]}</span>
      <span className="tnum opacity-70">{score}</span>
    </span>
  );
}
