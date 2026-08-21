import type { Metadata } from "next";
import Link from "next/link";
import { ScanSearch, ShieldAlert } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { Badge, Panel } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Investigate",
  description:
    "Open an AML/CTF investigation on a Bitcoin or Ethereum address: ego-network analysis, typology findings, triage disposition and a draft case file.",
};

/** Subjects that demonstrate a different disposition each, so the workspace can
 *  be judged on more than a single happy path. */
const EXAMPLES = [
  {
    chain: "eth" as const,
    address: "0x098B716B8Aaf21512996dC57EB0615e2383E2f96",
    label: "Lazarus Group",
    hint: "Sanctions match on the subject. Expect escalation and a hard stop.",
    tone: "danger" as const,
  },
  {
    chain: "btc" as const,
    address: "1295rkVyNfFpqZpXvKGhDqwhP1jZcNNDMV",
    label: "SUEX OTC",
    hint: "Designated exchange with a large co-spend cluster.",
    tone: "danger" as const,
  },
  {
    chain: "eth" as const,
    address: "0x28C6c06298d514Db089934071355E5743bf21d60",
    label: "Binance hot wallet",
    hint: "Attributed service. Structural findings are expected and de-weighted.",
    tone: "success" as const,
  },
];

export default function InvestigateLanding() {
  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-heading">Investigate</h1>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-foreground-muted">
          Runs an ego-network extraction around one subject, tests the activity against a set of
          named money-laundering typologies, and drafts a case file with the evidence and the
          arguments against it.
        </p>
      </div>

      <Panel overflowVisible className="flex-1" bodyClassName="flex items-center p-6">
        <div className="mx-auto w-full max-w-2xl text-center">
          <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ScanSearch className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-base font-semibold text-foreground">Choose a subject</h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-foreground-muted">
            Enter the address under review. The assessment covers the transaction window the
            block explorer will serve, and says so wherever it draws a conclusion.
          </p>

          <SearchBar className="mx-auto mt-4 w-full max-w-lg" compact primary />

          <div className="mt-6">
            <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              Or open a worked example
            </p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-3">
              {EXAMPLES.map((example) => (
                <li key={example.address}>
                  <Link
                    href={`/investigate/${example.chain}/${example.address}`}
                    className="flex h-full flex-col gap-1 rounded-md border border-border bg-surface-2/40 p-3 text-left transition-colors duration-200 hover:border-border-strong hover:bg-surface-2"
                  >
                    <span className="flex items-center gap-1.5">
                      <Badge tone={example.tone}>{example.chain.toUpperCase()}</Badge>
                      <span className="truncate text-xs font-medium text-foreground">
                        {example.label}
                      </span>
                    </span>
                    <span className="text-[11px] leading-relaxed text-foreground-muted">
                      {example.hint}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <p className="mx-auto mt-6 flex max-w-xl items-start gap-2 rounded-md border border-warning/40 bg-warning/8 p-3 text-left text-[11px] leading-relaxed text-foreground-muted">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              Output supports human review. Typology matches are &ldquo;consistent with&rdquo;
              findings, priority scores order a queue, and nothing here establishes that anyone
              committed an offence. Filing decisions and customer action remain with a qualified
              compliance professional.
            </span>
          </p>
        </div>
      </Panel>
    </div>
  );
}
