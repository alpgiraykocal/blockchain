"use client";

import { DataTable, type Column } from "@/components/ui/data-table";
import { AddressLink } from "@/components/ui/address-link";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { formatCoin, formatNumber, formatUsd } from "@/lib/format";
import { useT } from "@/lib/i18n/context";
import type { GraphEdge, GraphNode } from "@/lib/types";

interface Row {
  edge: GraphEdge;
  source: GraphNode | undefined;
  target: GraphNode | undefined;
}

/** Text equivalent of the graph. A force-directed canvas is unreadable to a
 *  screen reader, so the same data is always available as an adjacency list. */
export function AdjacencyTable({
  nodes,
  edges,
  onSelect,
}: {
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
  onSelect?: (id: string) => void;
}) {
  const t = useT().ui.graph;
  const rows: Row[] = edges.map((edge) => ({
    edge,
    source: nodes[edge.source],
    target: nodes[edge.target],
  }));

  const columns: Column<Row>[] = [
    {
      key: "source",
      header: "From",
      cell: (row) =>
        row.source ? (
          <AddressLink
            chain={row.source.chain}
            address={row.source.address}
            label={row.source.label}
          />
        ) : (
          <span className="text-foreground-muted">—</span>
        ),
      sortValue: (row) => row.source?.label ?? row.edge.source,
    },
    {
      key: "target",
      header: "To",
      cell: (row) =>
        row.target ? (
          <AddressLink
            chain={row.target.chain}
            address={row.target.address}
            label={row.target.label}
          />
        ) : (
          <span className="text-foreground-muted">—</span>
        ),
      sortValue: (row) => row.target?.label ?? row.edge.target,
    },
    {
      key: "txCount",
      header: "Txs",
      align: "right",
      cell: (row) => formatNumber(row.edge.txCount),
      sortValue: (row) => row.edge.txCount,
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      cell: (row) => (
        <span title={formatUsd(row.edge.value.usd)}>
          {formatCoin(row.edge.value, row.target?.chain ?? "btc")}
        </span>
      ),
      sortValue: (row) => row.edge.value.coin,
    },
    {
      key: "usd",
      header: "USD",
      align: "right",
      cell: (row) => formatUsd(row.edge.value.usd, true),
      sortValue: (row) => row.edge.value.usd ?? 0,
    },
    {
      key: "risk",
      header: t.counterpartyRisk,
      align: "right",
      cell: (row) => {
        const risk = Math.max(row.source?.riskScore ?? 0, row.target?.riskScore ?? 0);
        const tone = risk >= 70 ? "danger" : risk >= 40 ? "warning" : "neutral";
        return (
          <Badge tone={tone} className="tnum">
            {risk}
          </Badge>
        );
      },
      sortValue: (row) => Math.max(row.source?.riskScore ?? 0, row.target?.riskScore ?? 0),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.edge.id}
      caption={t.adjacencyCaption}
      initialSort={{ key: "value", direction: "desc" }}
      onRowClick={onSelect ? (row) => onSelect(row.edge.target) : undefined}
      emptyState={
        <EmptyState
          title={t.noLinks}
          description={t.noLinksBody}
        />
      }
    />
  );
}
