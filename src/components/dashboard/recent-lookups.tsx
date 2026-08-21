"use client";

import { Clock, History } from "lucide-react";
import { useEffect, useState } from "react";
import { readRecent, type RecentEntry } from "@/components/search-bar";
import { AddressLink } from "@/components/ui/address-link";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { formatRelative } from "@/lib/format";
import { storageEvent } from "@/lib/storage";

export function RecentLookups() {
  const [recent, setRecent] = useState<RecentEntry[] | null>(null);

  useEffect(() => {
    const sync = () => setRecent(readRecent());
    sync();
    window.addEventListener(storageEvent("recent"), sync);
    return () => window.removeEventListener(storageEvent("recent"), sync);
  }, []);

  // null means "not read yet" — avoids flashing the empty state during hydration.
  if (recent === null) {
    return (
      <ul className="space-y-2" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <li key={index} className="skeleton h-8 w-full" />
        ))}
      </ul>
    );
  }

  if (!recent.length) {
    return (
      <EmptyState
        icon={<History className="size-5" aria-hidden="true" />}
        title="No lookups yet"
        description="Addresses you inspect appear here. The list is stored in this browser only and never leaves your device."
      />
    );
  }

  return (
    <ul className="space-y-1.5">
      {recent.map((item) => (
        <li
          key={`${item.chain}:${item.address}`}
          className="flex items-center justify-between gap-2 rounded border border-border bg-surface-2/40 px-2 py-1.5"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Badge tone="neutral">{item.chain.toUpperCase()}</Badge>
            <AddressLink chain={item.chain} address={item.address} head={10} tail={8} />
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-foreground-muted">
            <Clock className="size-3" aria-hidden="true" />
            {formatRelative(item.at)}
          </span>
        </li>
      ))}
    </ul>
  );
}
