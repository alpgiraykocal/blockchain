"use client";

import { Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { detectChain, isValidAddress } from "@/lib/chains/registry";
import { storageEvent, storageKey } from "@/lib/storage";
import { useClaimPrimarySearch } from "@/components/primary-search";
import { truncateAddress } from "@/lib/format";
import type { ChainId } from "@/lib/types";
import { cn } from "@/lib/utils";

const RECENT_KEY = storageKey("recent");
const RECENT_EVENT = storageEvent("recent");
const MAX_RECENT = 6;

export interface RecentEntry {
  chain: ChainId;
  address: string;
  at: string;
}

export function readRecent(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

export function pushRecent(entry: Omit<RecentEntry, "at">) {
  if (typeof window === "undefined") return;
  const existing = readRecent().filter(
    (item) => !(item.chain === entry.chain && item.address === entry.address),
  );
  const next = [{ ...entry, at: new Date().toISOString() }, ...existing].slice(0, MAX_RECENT);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(RECENT_EVENT));
}

export function SearchBar({
  className,
  autoFocus,
  compact = false,
  primary = false,
  placeholder = "Search a BTC or ETH address, or an ENS name",
}: {
  className?: string;
  autoFocus?: boolean;
  /** Header usage: the placeholder shortens rather than being cut mid-word. */
  compact?: boolean;
  /** This field is the page's call to action, so the header one stands down. */
  primary?: boolean;
  placeholder?: string;
}) {
  useClaimPrimarySearch(primary);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (!compact) return;
    const media = window.matchMedia("(max-width: 640px)");
    const sync = () => setNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [compact]);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setRecent(readRecent());
    sync();
    window.addEventListener(RECENT_EVENT, sync);
    return () => window.removeEventListener(RECENT_EVENT, sync);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = useCallback(
    (chain: ChainId, address: string) => {
      pushRecent({ chain, address });
      setOpen(false);
      router.push(`/address/${chain}/${address}`);
    },
    [router],
  );

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const value = query.trim();
      if (!value) return;

      const chain = detectChain(value);
      if (chain && isValidAddress(chain, value) && !value.toLowerCase().endsWith(".eth")) {
        setError(null);
        go(chain, value);
        return;
      }

      // ENS and anything ambiguous goes through the server, which resolves it.
      setBusy(true);
      setError(null);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const data = await response.json();
        if (!response.ok || !data.hits?.length) {
          setError(
            data.hint ??
              data.error ??
              "Nothing matched. Enter a full BTC address, ETH address or ENS name.",
          );
          return;
        }
        go(data.hits[0].chain, data.hits[0].address);
      } catch {
        setError("Search failed — check your connection and retry.");
      } finally {
        setBusy(false);
      }
    },
    [query, go],
  );

  return (
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <form onSubmit={submit} role="search">
        <label htmlFor={inputId} className="sr-only">
          Search address
        </label>
        <div
          className={cn(
            "flex h-11 min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3",
            // The wrapper carries the focus treatment; the input's own outline is
            // suppressed below so the two do not stack into a double ring.
            "transition-[border-color,box-shadow] duration-150",
            "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25",
            error && "border-destructive",
          )}
        >
          <Search className="size-4 shrink-0 text-foreground-muted" aria-hidden="true" />
          <input
            id={inputId}
            value={query}
            autoFocus={autoFocus}
            spellCheck={false}
            autoComplete="off"
            inputMode="text"
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              if (error) setError(null);
            }}
            placeholder={narrow ? "Search address" : placeholder}
            aria-describedby={error ? `${inputId}-error` : undefined}
            aria-invalid={error ? true : undefined}
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-foreground outline-none focus-visible:outline-none placeholder:font-sans placeholder:text-foreground-muted"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setError(null);
              }}
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded text-foreground-muted transition-colors duration-150 hover:bg-surface-2 hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
          {busy ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-secondary" aria-hidden="true" />
          ) : null}
        </div>
      </form>

      {error ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="mt-1.5 text-xs leading-relaxed text-destructive"
        >
          {error}
        </p>
      ) : null}

      {open && recent.length > 0 && !query ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-72 overflow-y-auto overscroll-contain rounded-md border border-border bg-surface shadow-lg">
          <p className="sticky top-0 border-b border-border bg-surface px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
            Recent
          </p>
          <ul>
            {recent.map((item) => (
              <li key={`${item.chain}:${item.address}`}>
                <button
                  type="button"
                  onClick={() => go(item.chain, item.address)}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-2"
                >
                  <span className="rounded border border-border-strong px-1 py-0.5 text-[10px] font-semibold uppercase text-foreground-muted">
                    {item.chain}
                  </span>
                  <span className="truncate font-mono text-xs text-foreground">
                    {truncateAddress(item.address, 14, 10)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
