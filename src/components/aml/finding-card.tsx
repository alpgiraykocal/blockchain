import { CircleSlash, Scale, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import type { TypologyFinding } from "@/lib/aml/types";
import { cn } from "@/lib/utils";

const STAGE_LABEL: Record<TypologyFinding["stage"], string> = {
  placement: "Placement",
  layering: "Layering",
  integration: "Integration",
  unclear: "Stage unclear",
};

const STRENGTH_TONE = {
  indicative: "danger",
  supporting: "warning",
  weak: "neutral",
} as const;

const BASIS_LABEL = {
  observed: "observed",
  derived: "derived",
  attribution: "attribution",
} as const;

export function FindingCard({ finding }: { finding: TypologyFinding }) {
  const active = finding.matched && finding.weight > 0;
  const informational = finding.matched && finding.weight === 0;

  return (
    <article
      className={cn(
        "rounded-md border p-3",
        active
          ? finding.strength === "indicative"
            ? "border-destructive/45 bg-destructive/5"
            : "border-warning/45 bg-warning/5"
          : "border-border bg-surface-2/40",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          {active ? (
            <TriangleAlert
              className={cn(
                "mt-0.5 size-4 shrink-0",
                finding.strength === "indicative" ? "text-destructive" : "text-warning",
              )}
              aria-hidden="true"
            />
          ) : informational ? (
            <Scale className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
          ) : (
            <CircleSlash className="mt-0.5 size-4 shrink-0 text-foreground-muted" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-foreground">{finding.title}</h3>
            <p className="text-[11px] text-foreground-muted">
              {finding.family} · {STAGE_LABEL[finding.stage]}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {active ? (
            <Badge tone={STRENGTH_TONE[finding.strength]}>{finding.strength}</Badge>
          ) : informational ? (
            <Badge tone="info">context</Badge>
          ) : (
            <Badge tone="neutral">no match</Badge>
          )}
          {active ? <Badge tone="neutral">weight {finding.weight}</Badge> : null}
        </div>
      </header>

      <p className="mt-2 text-xs leading-relaxed text-foreground-muted">{finding.summary}</p>

      {finding.evidence.length ? (
        <>
          <p className="mt-2.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
            Evidence
          </p>
          <ul className="mt-1 space-y-1">
            {finding.evidence.map((item, index) => (
              <li key={`${item.label}-${index}`} className="break-words text-[11px] leading-relaxed">
                <span className="font-medium text-foreground">{item.label}</span>{" "}
                <Badge tone="neutral" className="align-middle">
                  {BASIS_LABEL[item.basis]}
                </Badge>{" "}
                <span className="text-foreground-muted">{item.detail}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {finding.counterIndicators.length ? (
        <>
          <p className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
            <ShieldAlert className="size-3" aria-hidden="true" />
            Arguments against
          </p>
          <ul className="mt-1 space-y-1">
            {finding.counterIndicators.map((item, index) => (
              <li
                key={index}
                className="break-words text-[11px] leading-relaxed text-foreground-muted before:mr-1 before:content-['—']"
              >
                {item}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </article>
  );
}
