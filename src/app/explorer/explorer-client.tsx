"use client";

import {
  AlertTriangle,
  Crosshair,
  Layers,
  RefreshCw,
  Route,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GraphCanvas, type GraphCanvasHandle } from "@/components/graph/graph-canvas";
import { GraphLegend } from "@/components/graph/graph-legend";
import { AdjacencyTable } from "@/components/graph/adjacency-table";
import { NodeInspector } from "@/components/graph/node-inspector";
import { Badge, Button, Panel } from "@/components/ui/primitives";
import { SearchBar } from "@/components/search-bar";
import { SubjectTabs } from "@/components/subject-tabs";
import { isChainId } from "@/lib/chains/registry";
import { shortestPath, useGraphStore } from "@/lib/graph-store";
import { truncateAddress } from "@/lib/format";
import type { GraphNode } from "@/lib/types";

/** Starting points that show what the canvas is for without asking the user to
 *  find an interesting address first. */
const EXAMPLES = [
  {
    chain: "eth" as const,
    address: "0x28C6c06298d514Db089934071355E5743bf21d60",
    label: "Binance hot wallet",
    hint: "Exchange hub - dense fan-out of labelled counterparties.",
  },
  {
    chain: "eth" as const,
    address: "0x119c71D3BbAC22029622cbaEC24854d3D32D2828",
    label: "1inch Network",
    hint: "DeFi router - contract attribution from the open feeds.",
  },
  {
    chain: "btc" as const,
    address: "1295rkVyNfFpqZpXvKGhDqwhP1jZcNNDMV",
    label: "SUEX OTC",
    hint: "OFAC-sanctioned - severe risk and a large co-spend cluster.",
  },
];

export function ExplorerClient() {
  const params = useSearchParams();
  const router = useRouter();

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const selectedId = useGraphStore((state) => state.selectedId);
  const loadingIds = useGraphStore((state) => state.loadingIds);
  const expanded = useGraphStore((state) => state.expanded);
  const truncatedIds = useGraphStore((state) => state.truncatedIds);
  const error = useGraphStore((state) => state.error);
  const select = useGraphStore((state) => state.select);
  const expand = useGraphStore((state) => state.expand);
  const reset = useGraphStore((state) => state.reset);
  const removeNode = useGraphStore((state) => state.removeNode);
  const clearError = useGraphStore((state) => state.clearError);

  const [pathAnchor, setPathAnchor] = useState<GraphNode | null>(null);
  const [maxNeighbors, setMaxNeighbors] = useState(12);
  const handleRef = useRef<GraphCanvasHandle | null>(null);

  const chainParam = params.get("chain");
  const addressParam = params.get("address");
  const seedKey = `${chainParam}:${addressParam}`;
  const seededRef = useRef<string | null>(null);

  // Seed the canvas from the URL exactly once per address, so a shared link
  // reproduces the same starting graph.
  useEffect(() => {
    if (!chainParam || !addressParam || !isChainId(chainParam)) return;
    if (seededRef.current === seedKey) return;
    seededRef.current = seedKey;
    reset();
    void expand(chainParam, addressParam, { maxNeighbors });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  const nodeList = useMemo(() => Object.values(nodes), [nodes]);
  const edgeList = useMemo(() => Object.values(edges), [edges]);
  const rootId = useMemo(() => {
    if (!chainParam || !addressParam || !isChainId(chainParam)) return null;
    return `${chainParam}:${addressParam.toLowerCase()}`;
  }, [chainParam, addressParam]);

  const selectedNode = selectedId ? (nodes[selectedId] ?? null) : null;

  const highlightPath = useMemo(() => {
    if (!pathAnchor || !selectedId || pathAnchor.id === selectedId) return null;
    return shortestPath(edges, pathAnchor.id, selectedId);
  }, [pathAnchor, selectedId, edges]);

  const handleExpand = useCallback(
    (node: GraphNode, direction: "both" | "in" | "out" = "both") => {
      void expand(node.chain, node.address, { direction, maxNeighbors });
    },
    [expand, maxNeighbors],
  );

  if (!nodeList.length && !loadingIds.size) {
    return (
      <div className="flex min-h-[calc(100dvh-9rem)] flex-col gap-4">
        <PageHeading />
        {/* overflowVisible: the search field's recent-list drops out of the panel
            box, and clipping it left the suggestions sliced in half. */}
        <Panel overflowVisible className="flex-1" bodyClassName="flex items-center p-6">
          <div className="mx-auto w-full max-w-2xl text-center">
            <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Layers className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-base font-semibold text-foreground">
              Seed the graph with an address
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-foreground-muted">
              Place a first node on the canvas, then expand its counterparties one hop at
              a time and follow the flow.
            </p>

            {/* No autoFocus: focusing on load popped the suggestion list open before
                the user had asked for anything. */}
            <SearchBar className="mx-auto mt-4 w-full max-w-lg" compact primary />

            <div className="mt-6">
              <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                Or start from an example
              </p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-3">
                {EXAMPLES.map((example) => (
                  <li key={example.address}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/explorer?chain=${example.chain}&address=${example.address}`,
                        )
                      }
                      className="flex h-full w-full cursor-pointer flex-col gap-1 rounded-md border border-border bg-surface-2/40 p-3 text-left transition-colors duration-200 hover:border-border-strong hover:bg-surface-2"
                    >
                      <span className="flex items-center gap-1.5">
                        <Badge tone="info">{example.chain.toUpperCase()}</Badge>
                        <span className="truncate text-xs font-medium text-foreground">
                          {example.label}
                        </span>
                      </span>
                      <span className="text-[11px] leading-relaxed text-foreground-muted">
                        {example.hint}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeading />

      {chainParam && addressParam && isChainId(chainParam) ? (
        <SubjectTabs chain={chainParam} address={addressParam} active="graph" />
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-md border border-destructive/45 bg-destructive/10 px-3 py-2.5"
        >
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="min-w-0 break-words text-xs text-destructive">{error}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={clearError}>
            Dismiss
          </Button>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          flush
          title="Transaction flow"
          description={`${nodeList.length} nodes · ${edgeList.length} links · ${expanded.size} expanded`}
          actions={
            <div className="flex items-center gap-1.5">
              <label className="hidden items-center gap-1.5 text-[11px] text-foreground-muted sm:flex">
                Fan-out
                <select
                  value={maxNeighbors}
                  onChange={(event) => setMaxNeighbors(Number(event.target.value))}
                  className="h-9 cursor-pointer rounded border border-border bg-surface px-1.5 text-xs text-foreground"
                >
                  {[6, 12, 20, 30].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <Button size="sm" variant="ghost" onClick={() => handleRef.current?.fit()}>
                <Crosshair className="size-3.5" aria-hidden="true" />
                Fit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleRef.current?.relayout()}>
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Re-layout
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  reset();
                  setPathAnchor(null);
                  seededRef.current = null;
                  router.replace("/explorer");
                }}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Clear
              </Button>
            </div>
          }
          className="min-h-[440px] xl:h-[calc(100dvh-11rem)]"
        >
          <div className="flex h-full min-h-[440px] flex-col">
            <div className="relative min-h-0 flex-1 bg-surface-2/30">
              <GraphCanvas
                nodes={nodeList}
                edges={edgeList}
                selectedId={selectedId}
                rootId={rootId}
                highlightPath={highlightPath}
                loadingIds={loadingIds}
                onSelect={select}
                onExpand={(node) => handleExpand(node, "both")}
                onReady={(handle) => {
                  handleRef.current = handle;
                }}
              />
              {loadingIds.size ? (
                <p className="pointer-events-none absolute left-3 top-3 rounded border border-border bg-surface/90 px-2 py-1 text-[11px] text-foreground-muted">
                  Expanding {loadingIds.size} node{loadingIds.size > 1 ? "s" : ""}…
                </p>
              ) : null}
              {pathAnchor ? (
                <p className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded border border-accent/50 bg-accent/10 px-2 py-1 text-[11px] text-accent">
                  <Route className="size-3" aria-hidden="true" />
                  Anchor: {truncateAddress(pathAnchor.address, 6, 4)}
                  {highlightPath
                    ? ` · path found (${highlightPath.length - 1} hops)`
                    : selectedId && selectedId !== pathAnchor.id
                      ? " · no path in current graph"
                      : " · select a second node"}
                </p>
              ) : null}
            </div>
            <div className="border-t border-border px-4 py-2.5">
              <GraphLegend />
            </div>
          </div>
        </Panel>

        <Panel
          flush
          title="Inspector"
          className="min-h-[420px] xl:sticky xl:top-[4.75rem] xl:h-[calc(100dvh-11rem)]"
        >
          <NodeInspector
            node={selectedNode}
            isPathAnchor={Boolean(pathAnchor && selectedNode && pathAnchor.id === selectedNode.id)}
            onExpand={handleExpand}
            onRemove={(node) => {
              removeNode(node.id);
              if (pathAnchor?.id === node.id) setPathAnchor(null);
            }}
            onSetPathAnchor={setPathAnchor}
          />
        </Panel>
      </div>

      <Panel
        flush
        title="Adjacency list"
        description="Text equivalent of the canvas — sortable and screen-reader friendly."
        actions={
          truncatedIds.size ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-warning">
              <AlertTriangle className="size-3" aria-hidden="true" />
              {truncatedIds.size} node{truncatedIds.size > 1 ? "s" : ""} truncated to top counterparties
            </span>
          ) : null
        }
      >
        <AdjacencyTable nodes={nodes} edges={edgeList} onSelect={select} />
      </Panel>
    </div>
  );
}

function PageHeading() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-heading">Graph explorer</h1>
        <p className="mt-0.5 text-xs text-foreground-muted">
          Click to select, double-click to expand. Every expansion pulls one hop of
          counterparties from live explorer data.
        </p>
      </div>
    </div>
  );
}
