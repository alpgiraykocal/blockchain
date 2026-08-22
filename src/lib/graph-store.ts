"use client";
import { getDictionary } from "./i18n";
import { clientLocale } from "./i18n/config";

import { create } from "zustand";
import type { ChainId, GraphEdge, GraphNode } from "./types";

export interface GraphFragment {
  root: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
  totalNeighbors: number;
}

export type ExpandDirection = "both" | "in" | "out";

interface GraphState {
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
  expanded: Set<string>;
  selectedId: string | null;
  pinnedIds: string[];
  loadingIds: Set<string>;
  error: string | null;
  truncatedIds: Set<string>;

  select: (id: string | null) => void;
  reset: () => void;
  removeNode: (id: string) => void;
  expand: (
    chain: ChainId,
    address: string,
    options?: { direction?: ExpandDirection; maxNeighbors?: number; select?: boolean },
  ) => Promise<void>;
  clearError: () => void;
}

function mergeFragment(state: GraphState, fragment: GraphFragment) {
  const nodes = { ...state.nodes };
  for (const node of fragment.nodes) {
    // Never let a neighbour stub overwrite a fully expanded node's own data.
    const existing = nodes[node.id];
    nodes[node.id] = existing
      ? { ...node, ...existing, tags: existing.tags.length ? existing.tags : node.tags }
      : node;
  }

  const edges = { ...state.edges };
  for (const edge of fragment.edges) edges[edge.id] = edge;

  return { nodes, edges };
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: {},
  edges: {},
  expanded: new Set<string>(),
  selectedId: null,
  pinnedIds: [],
  loadingIds: new Set<string>(),
  error: null,
  truncatedIds: new Set<string>(),

  select: (id) => set({ selectedId: id }),

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      nodes: {},
      edges: {},
      expanded: new Set<string>(),
      selectedId: null,
      pinnedIds: [],
      loadingIds: new Set<string>(),
      error: null,
      truncatedIds: new Set<string>(),
    }),

  removeNode: (id) => {
    const { nodes, edges, expanded, selectedId } = get();
    const nextNodes = { ...nodes };
    delete nextNodes[id];
    const nextEdges = Object.fromEntries(
      Object.entries(edges).filter(([, edge]) => edge.source !== id && edge.target !== id),
    );
    const nextExpanded = new Set(expanded);
    nextExpanded.delete(id);
    set({
      nodes: nextNodes,
      edges: nextEdges,
      expanded: nextExpanded,
      selectedId: selectedId === id ? null : selectedId,
    });
  },

  expand: async (chain, address, options = {}) => {
    const id = `${chain}:${address.toLowerCase()}`;
    const { loadingIds } = get();
    if (loadingIds.has(id)) return;

    set({ loadingIds: new Set(loadingIds).add(id), error: null });

    const params = new URLSearchParams({ chain, address });
    if (options.direction && options.direction !== "both") {
      params.set("direction", options.direction);
    }
    params.set("maxNeighbors", String(options.maxNeighbors ?? 12));

    try {
      const response = await fetch(`/api/graph?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ? `${data.error} (${data.detail})` : data.error);
      }

      set((state) => {
        const merged = mergeFragment(state, data as GraphFragment);
        const expanded = new Set(state.expanded).add(id);
        const truncatedIds = new Set(state.truncatedIds);
        if (data.truncated) truncatedIds.add(id);
        const loading = new Set(state.loadingIds);
        loading.delete(id);
        return {
          ...merged,
          expanded,
          truncatedIds,
          loadingIds: loading,
          selectedId: options.select === false ? state.selectedId : id,
        };
      });
    } catch (error) {
      set((state) => {
        const loading = new Set(state.loadingIds);
        loading.delete(id);
        return {
          loadingIds: loading,
          error: error instanceof Error ? error.message : getDictionary(clientLocale()).ui.graph.expansionFailed,
        };
      });
    }
  },
}));

/** Breadth-first shortest path over the undirected view of the current graph. */
export function shortestPath(
  edges: Record<string, GraphEdge>,
  from: string,
  to: string,
): string[] | null {
  if (from === to) return [from];
  const neighbors = new Map<string, string[]>();
  for (const edge of Object.values(edges)) {
    if (!neighbors.has(edge.source)) neighbors.set(edge.source, []);
    if (!neighbors.has(edge.target)) neighbors.set(edge.target, []);
    neighbors.get(edge.source)!.push(edge.target);
    neighbors.get(edge.target)!.push(edge.source);
  }

  const queue: string[][] = [[from]];
  const seen = new Set([from]);
  while (queue.length) {
    const path = queue.shift()!;
    const tail = path[path.length - 1];
    for (const next of neighbors.get(tail) ?? []) {
      if (seen.has(next)) continue;
      const extended = [...path, next];
      if (next === to) return extended;
      seen.add(next);
      queue.push(extended);
    }
  }
  return null;
}
