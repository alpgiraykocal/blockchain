"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  /** Cell renderer. Keep it pure — it runs on every sort. */
  cell: (row: T) => ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => number | string;
  align?: "left" | "right";
  className?: string;
  headerHint?: string;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  emptyState,
  onRowClick,
  initialSort,
  dense = true,
  caption,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  initialSort?: { key: string; direction: "asc" | "desc" };
  dense?: boolean;
  caption?: string;
}) {
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column?.sortValue) return rows;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = column.sortValue!(a);
      const right = column.sortValue!(b);
      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * factor;
      }
      return String(left).localeCompare(String(right)) * factor;
    });
  }, [rows, columns, sort]);

  if (!rows.length && emptyState) return <>{emptyState}</>;

  return (
    <div className="scroll-x min-w-0">
      <table className="w-full min-w-[640px] border-collapse text-left">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => {
              const active = sort?.key === column.key;
              const ariaSort = active
                ? sort!.direction === "asc"
                  ? "ascending"
                  : "descending"
                : "none";
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.sortValue ? ariaSort : undefined}
                  title={column.headerHint}
                  className={cn(
                    "bg-surface-2/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted",
                    column.align === "right" && "text-right",
                    column.className,
                  )}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSort((current) =>
                          current?.key === column.key
                            ? {
                                key: column.key,
                                direction: current.direction === "asc" ? "desc" : "asc",
                              }
                            : { key: column.key, direction: "desc" },
                        )
                      }
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1 rounded transition-colors duration-150 hover:text-foreground",
                        column.align === "right" && "flex-row-reverse",
                        active && "text-foreground",
                      )}
                    >
                      {column.header}
                      {active ? (
                        sort!.direction === "asc" ? (
                          <ChevronUp className="size-3" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="size-3" aria-hidden="true" />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-50" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-border/70 transition-colors duration-150 last:border-b-0",
                "hover:bg-surface-2",
                onRowClick && "cursor-pointer",
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-3 align-middle text-[13px] text-foreground",
                    dense ? "py-2" : "py-3",
                    column.align === "right" && "tnum text-right",
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
