import type { Metadata } from "next";
import Link from "next/link";
import { ScanSearch, ShieldAlert } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { Badge, Panel } from "@/components/ui/primitives";
import { getDictionary } from "@/lib/i18n";
import { type Locale, isLocale, localePath } from "@/lib/i18n/config";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const { ui } = getDictionary(isLocale(locale) ? locale : "en");
  return { title: ui.investigate.metaTitle, description: ui.investigate.metaDescription };
}

/** Subjects that demonstrate a different disposition each, so the workspace can
 *  be judged on more than a single happy path. */
const EXAMPLES = [
  {
    chain: "eth" as const,
    address: "0x098B716B8Aaf21512996dC57EB0615e2383E2f96",
    // Actor names are proper nouns and stay as published; only the hint that
    // explains why the example is here gets translated.
    label: "Lazarus Group",
    hintKey: "exampleLazarusHint" as const,
    tone: "danger" as const,
  },
  {
    chain: "btc" as const,
    address: "1295rkVyNfFpqZpXvKGhDqwhP1jZcNNDMV",
    label: "SUEX OTC",
    hintKey: "exampleSuexHint" as const,
    tone: "danger" as const,
  },
  {
    chain: "eth" as const,
    address: "0x28C6c06298d514Db089934071355E5743bf21d60",
    label: "Binance hot wallet",
    hintKey: "exampleBinanceHint" as const,
    tone: "success" as const,
  },
];

/* Rendered per request rather than prerendered: the CSP carries a per-request
 * nonce, and Next cannot stamp one onto HTML built at compile time - a
 * prerendered page under this policy would render and never hydrate. The cost is
 * small because these pages fetch their data client-side; the expensive work
 * sits in the API routes and their caches.
 */
export const dynamic = "force-dynamic";

export default async function InvestigateLanding({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const t = getDictionary(locale).ui.investigate;

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-heading">{t.heading}</h1>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-foreground-muted">
          {t.lede}
        </p>
      </div>

      <Panel overflowVisible className="flex-1" bodyClassName="flex items-center p-6">
        <div className="mx-auto w-full max-w-2xl text-center">
          <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ScanSearch className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-base font-semibold text-foreground">{t.chooseSubject}</h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-foreground-muted">
            {t.chooseSubjectBody}
          </p>

          <SearchBar className="mx-auto mt-4 w-full max-w-lg" compact primary />

          <div className="mt-6">
            <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              {t.workedExamples}
            </p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-3">
              {EXAMPLES.map((example) => (
                <li key={example.address}>
                  <Link
                    href={localePath(locale, `/investigate/${example.chain}/${example.address}`)}
                    className="flex h-full flex-col gap-1 rounded-md border border-border bg-surface-2/40 p-3 text-left transition-colors duration-200 hover:border-border-strong hover:bg-surface-2"
                  >
                    <span className="flex items-center gap-1.5">
                      <Badge tone={example.tone}>{example.chain.toUpperCase()}</Badge>
                      <span className="truncate text-xs font-medium text-foreground">
                        {example.label}
                      </span>
                    </span>
                    <span className="text-[11px] leading-relaxed text-foreground-muted">
                      {t[example.hintKey]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <p className="mx-auto mt-6 flex max-w-xl items-start gap-2 rounded-md border border-warning/40 bg-warning/8 p-3 text-left text-[11px] leading-relaxed text-foreground-muted">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              {t.disclaimer}
            </span>
          </p>
        </div>
      </Panel>
    </div>
  );
}
