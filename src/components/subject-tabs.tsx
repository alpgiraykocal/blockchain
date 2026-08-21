"use client";

import { ExternalLink, FileText, Network, ScanSearch } from "lucide-react";
import Link from "next/link";
import { CHAINS } from "@/lib/chains/registry";
import { truncateAddress } from "@/lib/format";
import type { ChainId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";

/**
 * One address, three lenses.
 *
 * The report, the investigation and the free-form graph all answer questions
 * about the same subject, and previously each was a separate destination with no
 * way across: search always landed on the report, and the report linked nowhere
 * near the investigation - the thing the product exists to do. This bar makes
 * the subject the constant and the lens the choice, so moving between them keeps
 * the user's place instead of restarting the task.
 */

const LENSES = [
  {
    key: "report",
    label: "Report",
    hint: "Balances, cluster, transactions",
    icon: FileText,
    href: (chain: ChainId, address: string) => `/address/${chain}/${address}`,
  },
  {
    key: "investigation",
    label: "Investigation",
    hint: "Typologies, disposition, case file",
    icon: ScanSearch,
    href: (chain: ChainId, address: string) => `/investigate/${chain}/${address}`,
  },
  {
    key: "graph",
    label: "Graph",
    hint: "Free-form expansion",
    icon: Network,
    href: (chain: ChainId, address: string) =>
      `/explorer?chain=${chain}&address=${encodeURIComponent(address)}`,
  },
] as const;

export function SubjectTabs({
  chain,
  address,
  active,
}: {
  chain: ChainId;
  address: string;
  active: "report" | "investigation" | "graph";
}) {
  const meta = CHAINS[chain];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-surface px-3 py-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="rounded border border-border-strong px-1.5 py-0.5 text-[10px] font-semibold uppercase text-foreground-muted">
          {meta.ticker}
        </span>
        <span
          className="truncate font-mono text-xs text-foreground-muted"
          title={address}
        >
          {truncateAddress(address, 10, 8)}
        </span>
        <CopyButton value={address} label="Copy address" />
      </div>

      <nav aria-label="Subject views">
        <ul className="flex flex-wrap items-center gap-1">
        {LENSES.map((lens) => {
          const isActive = lens.key === active;
          const Icon = lens.icon;
          return (
            <li key={lens.key}>
              <Link
                href={lens.href(chain, address)}
                aria-current={isActive ? "page" : undefined}
                title={lens.hint}
                className={cn(
                  "flex h-9 min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium",
                  "transition-colors duration-200",
                  isActive
                    ? "bg-primary/12 text-primary"
                    : "text-foreground-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                {lens.label}
              </Link>
            </li>
          );
          })}
        </ul>
      </nav>

      <a
        href={meta.explorerAddressUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto hidden cursor-pointer items-center gap-1 text-[11px] text-secondary underline-offset-2 transition-colors duration-150 hover:text-primary hover:underline sm:inline-flex"
      >
        Open on {meta.explorerName}
        <ExternalLink className="size-3" aria-hidden="true" />
      </a>
    </div>
  );
}
