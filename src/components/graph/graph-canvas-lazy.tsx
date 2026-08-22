"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { GraphCanvas } from "./graph-canvas";

export type { GraphCanvasHandle } from "./graph-canvas";

/**
 * `GraphCanvas` behind a deferred import.
 *
 * Cytoscape and its fcose layout are 580 KB raw / ~175 KB over the wire, which
 * is most of this route's JavaScript. Loading them with the page delays
 * hydration of the toolbar and the search field, and the canvas cannot draw
 * anything until `/api/graph` answers anyway - so the library and the first
 * fragment race each other instead of queueing.
 *
 * `ssr: false` for the same reason the chart uses it: the graph is built from a
 * client-side fetch, so a server pass would render an empty container twice.
 * The placeholder holds the caller's height so the swap shifts nothing.
 */
const LazyGraphCanvas = dynamic(
  () => import("./graph-canvas").then((module) => module.GraphCanvas),
  { ssr: false },
);

export function GraphCanvasLazy(props: ComponentProps<typeof GraphCanvas>) {
  return (
    <div className="size-full min-h-[360px]">
      <LazyGraphCanvas {...props} />
    </div>
  );
}
