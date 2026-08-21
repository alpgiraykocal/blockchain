"use client";

import { Download, FileText, Info } from "lucide-react";
import { useMemo } from "react";
import { Badge, Panel } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import { narrativeToMarkdown } from "@/lib/aml/narrative";
import type { AmlAssessment } from "@/lib/aml/types";

/**
 * The case file panel: the draft narrative plus the audit block that makes it
 * reproducible, and exports for a case management system. Everything here is a
 * draft for a human to review, edit and own.
 */
export function CaseFile({ assessment }: { assessment: AmlAssessment }) {
  const { narrative, audit, subject, limitations } = assessment;

  const markdown = useMemo(
    () =>
      narrativeToMarkdown(
        narrative,
        `Case file - ${subject.label ?? subject.address}`,
        audit as unknown as Record<string, unknown>,
      ),
    [narrative, audit, subject],
  );

  const markdownHref = useMemo(
    () =>
      typeof window === "undefined"
        ? undefined
        : URL.createObjectURL(new Blob([markdown], { type: "text/markdown" })),
    [markdown],
  );

  const jsonHref = useMemo(
    () =>
      typeof window === "undefined"
        ? undefined
        : URL.createObjectURL(
            new Blob([JSON.stringify(assessment, null, 2)], { type: "application/json" }),
          ),
    [assessment],
  );

  const stem = `case-${subject.chain}-${subject.address.slice(0, 10)}-${audit.assessmentId}`;

  return (
    <Panel
      title="Case file"
      description="Draft narrative, audit trail and export"
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          {markdownHref ? (
            <a
              href={markdownHref}
              download={`${stem}.md`}
              className="inline-flex h-9 min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border-strong px-2.5 text-xs font-medium text-foreground transition-colors duration-200 hover:bg-surface-2"
            >
              <FileText className="size-3.5" aria-hidden="true" />
              Markdown
            </a>
          ) : null}
          {jsonHref ? (
            <a
              href={jsonHref}
              download={`${stem}.json`}
              className="inline-flex h-9 min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border-strong px-2.5 text-xs font-medium text-foreground transition-colors duration-200 hover:bg-surface-2"
            >
              <Download className="size-3.5" aria-hidden="true" />
              JSON
            </a>
          ) : null}
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-foreground">{narrative.summary}</p>

      <section className="mt-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
          Chronology
        </h3>
        <ol className="mt-2 space-y-1.5">
          {narrative.chronology.map((entry, index) => (
            <li key={index} className="flex gap-2 text-xs leading-relaxed">
              <span className="tnum w-36 shrink-0 text-foreground-muted">
                {entry.at ? formatDate(entry.at) : "—"}
              </span>
              <span className="min-w-0 break-words text-foreground">{entry.event}</span>
            </li>
          ))}
        </ol>
      </section>

      {narrative.sections.map((section) => (
        <section key={section.heading} className="mt-4">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
            {section.heading}
          </h3>
          <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-foreground-muted">
            {section.body}
          </p>
        </section>
      ))}

      <section className="mt-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
          Data limitations
        </h3>
        <ul className="mt-1 space-y-1">
          {limitations.map((item, index) => (
            <li
              key={index}
              className="break-words text-[11px] leading-relaxed text-foreground-muted before:mr-1 before:content-['—']"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded border border-border bg-surface-2/40 p-3">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
          Audit
        </h3>
        <dl className="mt-1.5 grid gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2">
          <Row label="Assessment id" value={audit.assessmentId} mono />
          <Row label="Generated" value={formatDate(audit.generatedAt)} />
          <Row label="Engine / layout" value={`${audit.engineVersion} · ${audit.layoutVersion}`} />
          <Row label="Explorer" value={audit.dataSources.explorer} />
          <Row
            label="Sanctions list"
            value={`${audit.dataSources.sanctionsList}, issued ${formatDate(
              audit.dataSources.sanctionsIssued,
              false,
            )}`}
          />
          <Row label="Label snapshot" value={formatDate(audit.dataSources.labelSnapshot, false)} />
          <Row
            label="Hop depth / top-K"
            value={`${audit.filters.hopDepth} hop · top ${audit.filters.topK}`}
          />
          <Row
            label="Reduction applied"
            value={audit.reductionApplied.join(", ") || "none"}
          />
        </dl>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {audit.dataSources.labelSources.map((source) => (
            <Badge key={source.id} tone="neutral">
              {source.id} @ {source.version ?? "unknown"}
            </Badge>
          ))}
        </div>
      </section>

      <p className="mt-4 flex items-start gap-2 rounded border border-info/35 bg-info/8 p-3 text-[11px] leading-relaxed text-foreground-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
        <span>{narrative.disclaimer}</span>
      </p>
    </Panel>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className={`min-w-0 truncate text-foreground ${mono ? "font-mono" : ""}`} title={value}>
        {value}
      </dd>
    </div>
  );
}
