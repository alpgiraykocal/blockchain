"use client";
import { useT } from "@/lib/i18n/context";

import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import fcose from "cytoscape-fcose";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { truncateAddress } from "@/lib/format";
import type { GraphEdge, GraphNode, NodeKind } from "@/lib/types";

let layoutRegistered = false;
if (typeof window !== "undefined" && !layoutRegistered) {
  cytoscape.use(fcose);
  layoutRegistered = true;
}

const KIND_VAR: Record<NodeKind, string> = {
  address: "--node-address",
  entity: "--node-entity",
  exchange: "--node-exchange",
  mixer: "--node-mixer",
  service: "--node-service",
  unknown: "--node-unknown",
};

function readVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Node radius scales with the log of transaction count — linear sizing makes
 *  hub nodes swallow the canvas. */
/** Zoom below which labels are dropped. Tuned so a fitted phone-width canvas
 *  still keeps them: a 13-node star fits at roughly 0.36 there. */
const LABEL_ZOOM_FLOOR = 0.3;

function nodeSize(txCount: number) {
  return Math.round(22 + Math.min(30, Math.log10(Math.max(1, txCount)) * 14));
}

export interface GraphCanvasHandle {
  fit: () => void;
  relayout: () => void;
}

export function GraphCanvas({
  nodes,
  edges,
  selectedId,
  rootId,
  highlightPath,
  loadingIds,
  onSelect,
  onExpand,
  onReady,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  rootId: string | null;
  highlightPath?: string[] | null;
  loadingIds: Set<string>;
  onSelect: (id: string | null) => void;
  onExpand: (node: GraphNode) => void;
  onReady?: (handle: GraphCanvasHandle) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const { resolved } = useTheme();
  const t = useT().ui.graph;

  const elements = useMemo<ElementDefinition[]>(() => {
    const nodeElements: ElementDefinition[] = nodes.map((node) => ({
      group: "nodes",
      data: {
        id: node.id,
        label: node.label ?? truncateAddress(node.address, 6, 4),
        kind: node.kind,
        risk: node.riskScore,
        size: nodeSize(node.txCount),
        isRoot: node.id === rootId ? 1 : 0,
      },
    }));

    const nodeIds = new Set(nodes.map((node) => node.id));
    const edgeElements: ElementDefinition[] = edges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map((edge) => ({
        group: "edges",
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          txCount: edge.txCount,
          width: Math.min(6, 1 + Math.log10(Math.max(1, edge.txCount)) * 2),
        },
      }));

    return [...nodeElements, ...edgeElements];
  }, [nodes, edges, rootId]);

  const styleSheet = useCallback((): cytoscape.StylesheetJson => {
    const edgeColor = readVar("--edge", "#94a3b8");
    const highlight = readVar("--edge-highlight", "#f59e0b");
    const surface = readVar("--surface", "#0f172a");
    const foreground = readVar("--foreground", "#e2e8f0");
    const danger = readVar("--destructive", "#dc2626");
    const warning = readVar("--warning", "#d97706");
    const ring = readVar("--ring", "#60a5fa");

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
          // Cytoscape parses this string itself and cannot resolve CSS variables.
          "font-family": "Fira Sans, ui-sans-serif, system-ui, sans-serif",
          "font-size": 12,
          "font-weight": 500,
          "text-valign": "bottom",
          "text-margin-y": 7,
          "text-max-width": "128px",
          "text-wrap": "ellipsis",
          // An outline in the canvas colour keeps labels legible over edges and
          // neighbouring nodes without the boxed-in look of a filled chip.
          "text-outline-color": surface,
          "text-outline-width": 3,
          "text-outline-opacity": 1,
          "transition-property": "border-color, border-width, background-color",
          "transition-duration": 180,
        },
      },
      ...(Object.entries(KIND_VAR).map(([kind, variable]) => ({
        selector: `node[kind = "${kind}"]`,
        style: { "background-color": readVar(variable, "#64748b") },
      })) as cytoscape.StylesheetJson),
      {
        selector: "node[risk >= 70]",
        style: { "border-color": danger, "border-width": 3 },
      },
      {
        selector: "node[risk >= 40][risk < 70]",
        style: { "border-color": warning, "border-width": 3 },
      },
      {
        selector: "node[isRoot = 1]",
        style: {
          "border-color": ring,
          "border-width": 4,
          shape: "round-diamond",
        },
      },
      {
        selector: "node:selected",
        style: {
          "border-color": ring,
          "border-width": 5,
          "overlay-color": ring,
          "overlay-opacity": 0.14,
          "overlay-padding": 6,
        },
      },
      { selector: "node.loading", style: { opacity: 0.45 } },
      // Far enough out, labels overlap into noise; the shapes still carry
      // category and risk. The focus node and the selection keep their label at
      // any zoom, so the view never loses its anchor.
      { selector: "node.zoomed-out", style: { label: "" } },
      { selector: "node.zoomed-out[isRoot = 1]", style: { label: "data(label)" } },
      { selector: "node.zoomed-out:selected", style: { label: "data(label)" } },
      { selector: "node.faded", style: { opacity: 0.18 } },
      {
        selector: "edge",
        style: {
          width: "data(width)",
          "line-color": edgeColor,
          "line-opacity": 0.6,
          "curve-style": "bezier",
          "target-arrow-color": edgeColor,
          "target-arrow-shape": "triangle",
          "arrow-scale": 0.85,
          "transition-property": "line-color, line-opacity, width",
          "transition-duration": 180,
        },
      },
      { selector: "edge.faded", style: { "line-opacity": 0.08 } },
      {
        selector: "edge.path",
        style: {
          "line-color": highlight,
          "target-arrow-color": highlight,
          "line-opacity": 1,
          width: 4,
          label: "data(txCount)",
          "font-size": 9,
          color: highlight,
          "text-background-color": surface,
          "text-background-opacity": 0.85,
          "text-background-padding": "2px",
        },
      },
      {
        selector: "node.path",
        style: { "border-color": highlight, "border-width": 4, opacity: 1 },
      },
    ] as cytoscape.StylesheetJson;
  }, []);

  // Mount once; elements and styles are patched in later effects so panning and
  // zoom survive every expansion.
  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: styleSheet(),
      minZoom: 0.15,
      maxZoom: 3,
      pixelRatio: 1,
    });

    const syncLabelVisibility = () => {
      cy.batch(() => {
        if (cy.zoom() < LABEL_ZOOM_FLOOR) cy.nodes().addClass("zoomed-out");
        else cy.nodes().removeClass("zoomed-out");
      });
    };
    cy.on("zoom", syncLabelVisibility);

    cy.on("tap", "node", (event) => onSelect(event.target.id()));
    cy.on("tap", (event) => {
      if (event.target === cy) onSelect(null);
    });
    cy.on("dbltap", "node", (event) => {
      const id = event.target.id();
      const node = nodes.find((item) => item.id === id);
      if (node) onExpand(node);
    });

    cyRef.current = cy;
    onReady?.({
      fit: () => fitViewport(cy, true),
      relayout: () => runLayout(cy),
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the tap handler bound to the latest node list.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.removeListener("dbltap", "node");
    cy.on("dbltap", "node", (event) => {
      const node = nodes.find((item) => item.id === event.target.id());
      if (node) onExpand(node);
    });
  }, [nodes, onExpand]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.style(styleSheet());
  }, [resolved, styleSheet]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const incoming = new Set(elements.map((element) => element.data.id as string));
    const removed = cy.elements().filter((element) => !incoming.has(element.id()));
    removed.remove();

    const existing = new Set(cy.elements().map((element) => element.id()));
    const added = elements.filter((element) => !existing.has(element.data.id as string));

    if (!added.length && !removed.length) return;
    cy.add(added);
    runLayout(cy, added.length === elements.length);
  }, [elements]);

  // Re-fit when the container resizes (panel collapse, viewport change).
  useEffect(() => {
    const cy = cyRef.current;
    const container = containerRef.current;
    if (!cy || !container || typeof ResizeObserver === "undefined") return;
    // Cytoscape caches the container size at init. In a flex layout that size is
    // often still 0, which parks the whole graph in the top-left corner — so
    // resize and refit whenever the box actually changes.
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!container.clientWidth || !container.clientHeight) return;
        cy.resize();
        fitViewport(cy, false);
      });
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [elements]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("loading");
    for (const id of loadingIds) cy.getElementById(id).addClass("loading");
  }, [loadingIds]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().unselect();
    if (selectedId) cy.getElementById(selectedId).select();
  }, [selectedId]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass("path faded");
    if (!highlightPath || highlightPath.length < 2) return;

    const pathNodes = cy.collection();
    highlightPath.forEach((id) => pathNodes.merge(cy.getElementById(id)));
    const pathEdges = pathNodes.edgesWith(pathNodes);

    cy.elements().addClass("faded");
    pathNodes.removeClass("faded").addClass("path");
    pathEdges.removeClass("faded").addClass("path");
  }, [highlightPath]);

  return (
    <div
      ref={containerRef}
      className="size-full min-h-[360px] touch-manipulation"
      role="application"
      aria-label={t.canvasLabel}
    />
  );
}

function runLayout(cy: Core, initial = true) {
  // The container is frequently still 0x0 when the first fragment arrives, and
  // cytoscape caches that size — laying out against it parks the graph in the
  // corner with no later resize event to correct it.
  cy.resize();

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  cy.layout({
    name: "fcose",
    quality: "proof",
    // fcose needs randomised seeding on the first pass: every node starts at the
    // origin otherwise, which collapses the result into a diagonal line.
    randomize: initial,
    // Positions are applied synchronously; the viewport move below carries the
    // motion instead, which keeps the fit deterministic rather than depending on
    // a layout event that may fire before the animation settles.
    animate: false,
    fit: false,
    padding: 60,
    nodeDimensionsIncludeLabels: true,
    nodeSeparation: 140,
    idealEdgeLength: () => 170,
    nodeRepulsion: () => 12000,
    edgeElasticity: () => 0.4,
    gravity: 0.2,
    numIter: 2500,
  } as cytoscape.LayoutOptions).run();

  fitViewport(cy, !prefersReducedMotion);
}

/** Frames the whole graph, clamping the zoom so a one- or two-node canvas does
 *  not open at 3x. */
function fitViewport(cy: Core, animate: boolean) {
  if (!cy.elements().length) return;

  // Stop any viewport animation already in flight. A running `cy.animate` keeps
  // writing zoom and pan for its full duration and finishes on the target it was
  // given, so it silently undid the correction the resize observer had just
  // applied - which is how the canvas kept opening with half the graph off the
  // left edge until the analyst pressed Fit.
  cy.stop();
  // Measure against the box as it is now, not as it was when cytoscape last
  // cached it. The container is often still settling when the first fragment
  // lands, and a stale width puts the centring calculation somewhere else.
  cy.resize();

  const bounds = cy.elements().boundingBox();
  // A phone-width canvas cannot spare 60px of margin on each side; spending it
  // there is what pushed the fit zoom below the label threshold.
  const padding = cy.width() < 520 ? 24 : 60;
  // Clamped to what cytoscape will actually apply: pan is derived from the zoom,
  // so computing it from a value the viewport then clamps offsets the whole graph.
  const zoom = Math.max(
    cy.minZoom(),
    Math.min(
      1.2,
      Math.min(
        (cy.width() - padding * 2) / Math.max(1, bounds.w),
        (cy.height() - padding * 2) / Math.max(1, bounds.h),
      ),
    ),
  );
  const center = {
    x: cy.width() / 2 - zoom * (bounds.x1 + bounds.w / 2),
    y: cy.height() / 2 - zoom * (bounds.y1 + bounds.h / 2),
  };

  if (animate) cy.animate({ zoom, pan: center }, { duration: 280, easing: "ease-out" });
  else cy.viewport({ zoom, pan: center });

  cy.batch(() => {
    if (zoom < LABEL_ZOOM_FLOOR) cy.nodes().addClass("zoomed-out");
    else cy.nodes().removeClass("zoomed-out");
  });
}
