"use client";

import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { truncateAddress } from "@/lib/format";
import type { EgoEdge, EgoNode } from "@/lib/aml/types";

/**
 * Deterministic radial layout for ego-network investigation.
 *
 * Positions are computed, not simulated. A force-directed layout puts the same
 * network somewhere different on every run, which is unusable when two analysts
 * have to discuss the same picture or when a screenshot goes into a case file.
 * Centre sits at the origin, ring 1 at a fixed radius ordered by priority, ring 2
 * outside it — same input, same picture, every time.
 */

const RING_RADIUS = [0, 240, 430];
const KIND_VAR: Record<string, string> = {
  address: "--node-address",
  entity: "--node-entity",
  exchange: "--node-exchange",
  mixer: "--node-mixer",
  service: "--node-service",
  unknown: "--node-unknown",
};

function readVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Node radius scales with priority so the eye lands on the triage order. */
function nodeSize(node: EgoNode): number {
  if (node.ring === 0) return 62;
  return Math.round(26 + (node.priority / 100) * 22);
}

function ringPosition(node: EgoNode, ringCounts: Record<number, number>) {
  if (node.ring === 0) return { x: 0, y: 0 };
  const count = Math.max(1, ringCounts[node.ring] ?? 1);
  // Start at twelve o'clock and walk clockwise, so the highest-priority node is
  // always top-centre and the reading order is the triage order.
  const angle = (node.ringIndex / count) * Math.PI * 2 - Math.PI / 2;
  const radius = RING_RADIUS[node.ring] ?? RING_RADIUS[RING_RADIUS.length - 1];
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

export function RadialGraph({
  nodes,
  edges,
  selectedId,
  onSelect,
  onExpand,
}: {
  nodes: EgoNode[];
  edges: EgoEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onExpand: (node: EgoNode) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const { resolved } = useTheme();

  const ringCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const node of nodes) counts[node.ring] = (counts[node.ring] ?? 0) + 1;
    return counts;
  }, [nodes]);

  const elements = useMemo<ElementDefinition[]>(() => {
    const nodeIds = new Set(nodes.map((node) => node.id));
    return [
      ...nodes.map((node) => ({
        group: "nodes" as const,
        data: {
          id: node.id,
          label: node.label ?? truncateAddress(node.address, 6, 4),
          kind: node.kind,
          ring: node.ring,
          risk: node.riskScore,
          size: nodeSize(node),
          hub: node.isServiceHub ? 1 : 0,
          priority: node.priority,
        },
        position: ringPosition(node, ringCounts),
      })),
      ...edges
        .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
        .map((edge) => ({
          group: "edges" as const,
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            width: Math.min(6, 1 + Math.log10(Math.max(1, edge.txCount)) * 2),
            ring: edge.ring,
          },
        })),
    ];
  }, [nodes, edges, ringCounts]);

  const styleSheet = useCallback((): cytoscape.StylesheetJson => {
    const surface = readVar("--surface", "#0f172a");
    const foreground = readVar("--foreground", "#e2e8f0");
    const edgeColor = readVar("--edge", "#94a3b8");
    const ring = readVar("--ring", "#60a5fa");
    const danger = readVar("--destructive", "#dc2626");
    const warning = readVar("--warning", "#d97706");

    return [
      {
        selector: "node",
        style: {
          width: "data(size)",
          height: "data(size)",
          "background-color": readVar("--node-unknown", "#64748b"),
          "border-width": 2,
          "border-color": surface,
          label: "data(label)",
          color: foreground,
          "font-family": "Fira Sans, ui-sans-serif, system-ui, sans-serif",
          "font-size": 12,
          "font-weight": 500,
          "text-valign": "bottom",
          "text-margin-y": 7,
          "text-max-width": "130px",
          "text-wrap": "ellipsis",
          "text-outline-color": surface,
          "text-outline-width": 3,
          "transition-property": "border-color, border-width",
          "transition-duration": 160,
        },
      },
      ...(Object.entries(KIND_VAR).map(([kind, variable]) => ({
        selector: `node[kind = "${kind}"]`,
        style: { "background-color": readVar(variable, "#64748b") },
      })) as cytoscape.StylesheetJson),
      { selector: "node[risk >= 70]", style: { "border-color": danger, "border-width": 4 } },
      {
        selector: "node[risk >= 40][risk < 70]",
        style: { "border-color": warning, "border-width": 3 },
      },
      {
        selector: "node[ring = 0]",
        style: { shape: "round-diamond", "border-color": ring, "border-width": 4, "font-size": 13 },
      },
      // Service hubs stay visible but recede: they are hubs by construction and
      // would otherwise pull the eye away from what is actually unusual.
      { selector: "node[hub = 1]", style: { opacity: 0.55, "border-style": "dashed" } },
      { selector: "node[ring = 2]", style: { "font-size": 11 } },
      {
        selector: "node:selected",
        style: {
          "border-color": ring,
          "border-width": 5,
          "overlay-color": ring,
          "overlay-opacity": 0.16,
          "overlay-padding": 8,
        },
      },
      {
        selector: "edge",
        style: {
          width: "data(width)",
          "line-color": edgeColor,
          "line-opacity": 0.55,
          "curve-style": "straight",
          "target-arrow-color": edgeColor,
          "target-arrow-shape": "triangle",
          "arrow-scale": 0.9,
        },
      },
      { selector: "edge[ring = 2]", style: { "line-opacity": 0.3, "line-style": "dashed" } },
    ] as cytoscape.StylesheetJson;
  }, []);

  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: styleSheet(),
      layout: { name: "preset" },
      minZoom: 0.2,
      maxZoom: 2.5,
      pixelRatio: 1,
    });
    cy.on("tap", "node", (event) => onSelect(event.target.id()));
    cy.on("tap", (event) => {
      if (event.target === cy) onSelect(null);
    });
    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.removeListener("dbltap", "node");
    cy.on("dbltap", "node", (event) => {
      const node = nodes.find((item) => item.id === event.target.id());
      if (node?.expandable) onExpand(node);
    });
  }, [nodes, onExpand]);

  useEffect(() => {
    cyRef.current?.style(styleSheet());
  }, [resolved, styleSheet]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().remove();
    cy.add(elements);
    // Positions are already final; only the viewport needs fitting.
    cy.resize();
    cy.fit(cy.elements(), 60);
    if (cy.zoom() > 1.1) {
      cy.zoom(1);
      cy.center(cy.elements());
    }
  }, [elements]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().unselect();
    if (selectedId) cy.getElementById(selectedId).select();
  }, [selectedId]);

  useEffect(() => {
    const cy = cyRef.current;
    const container = containerRef.current;
    if (!cy || !container || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!container.clientWidth || !container.clientHeight) return;
        cy.resize();
        if (cy.elements().length) cy.fit(cy.elements(), 60);
      });
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="size-full min-h-[380px] touch-manipulation"
      role="application"
      aria-label="Radial ego network. The counterparty table below carries the same data as text."
    />
  );
}
