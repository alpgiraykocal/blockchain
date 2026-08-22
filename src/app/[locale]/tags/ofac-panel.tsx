"use client";

import { Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { AddressLink } from "@/components/ui/address-link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { useI18n } from "@/lib/i18n/context";
import { formatDate } from "@/lib/format";
import type { OfacTable } from "@/lib/tags/ofac";
import type { ChainId } from "@/lib/types";

/** What the table renders. Rebuilt on mount from the interned `OfacTable` the
 *  server sends - see `screenableTable()` for why the wire shape differs. */
interface OfacRow {
  address: string;
  chain: ChainId;
  name: string;
  partyType: string;
  programs: string[];
  designatedAt: string | null;
}

function expand(table: OfacTable): OfacRow[] {
  return table.addresses.map((address, i) => ({
    address,
    chain: table.chains[table.chainOf[i]],
    name: table.names[table.nameOf[i]],
    partyType: table.partyTypes[table.partyTypeOf[i]],
    programs: table.programSets[table.programsOf[i]],
    designatedAt: table.dates[table.dateOf[i]],
  }));
}

/** The screenable slice of the OFAC snapshot is several hundred rows. Rendering
 *  all of them at once would blow the list-length budget, so the table is capped
 *  and the filter narrows it — the count line always states the true total. */
const PAGE_SIZE = 40;

export function OfacPanel({ table }: { table: OfacTable }) {
  const { t: dict, locale } = useI18n();
  const t = dict.ui.tags;
  const [query, setQuery] = useState("");

  const rows = useMemo(() => expand(table), [table]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        row.address.toLowerCase().includes(needle) ||
        row.name.toLowerCase().includes(needle) ||
        row.programs.some((program) => program.toLowerCase().includes(needle)) ||
        row.chain.includes(needle),
    );
  }, [rows, query]);

  const visible = filtered.slice(0, PAGE_SIZE);

  const columns: Column<OfacRow>[] = [
    {
      key: "name",
      header: t.ofacDesignated,
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5">
          <ShieldAlert className="size-3 shrink-0 text-destructive" aria-hidden="true" />
          <span className="truncate font-medium">{row.name}</span>
        </span>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: "address",
      header: t.colAddress,
      cell: (row) => <AddressLink chain={row.chain} address={row.address} head={10} tail={8} />,
      sortValue: (row) => row.address,
    },
    {
      key: "chain",
      header: t.colChain,
      cell: (row) => <Badge tone="info">{row.chain.toUpperCase()}</Badge>,
      sortValue: (row) => row.chain,
    },
    {
      key: "programs",
      header: t.ofacColProgramme,
      cell: (row) => (
        <span className="flex flex-wrap gap-1">
          {row.programs.length ? (
            row.programs.map((program) => (
              <Badge key={program} tone="danger">
                {program}
              </Badge>
            ))
          ) : (
            <span className="text-foreground-muted">—</span>
          )}
        </span>
      ),
      sortValue: (row) => row.programs.join(","),
    },
    {
      key: "type",
      header: t.ofacColType,
      cell: (row) => <span className="text-foreground-muted">{row.partyType}</span>,
      sortValue: (row) => row.partyType,
    },
    {
      key: "designated",
      header: t.ofacColDesignated,
      align: "right",
      cell: (row) => formatDate(row.designatedAt, false, locale),
      sortValue: (row) => (row.designatedAt ? new Date(row.designatedAt).getTime() : 0),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex h-11 min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 transition-colors duration-150 focus-within:border-ring">
        <Search className="size-4 shrink-0 text-foreground-muted" aria-hidden="true" />
        <label htmlFor="ofac-filter" className="sr-only">
          {t.ofacFilter}
        </label>
        <input
          id="ofac-filter"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.ofacFilter}
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
        />
      </div>

      <p className="text-[11px] text-foreground-muted" aria-live="polite">
        {t.ofacShowing(visible.length, filtered.length)}
        {filtered.length !== rows.length ? t.ofacFilteredFrom(rows.length) : ""}
      </p>

      <DataTable
        rows={visible}
        columns={columns}
        rowKey={(row) => `${row.chain}:${row.address}`}
        caption={t.ofacCaption}
        initialSort={{ key: "designated", direction: "desc" }}
        emptyState={
          <EmptyState
            title={t.ofacNoMatch}
            description={t.ofacNoMatchBody}
          />
        }
      />
    </div>
  );
}
