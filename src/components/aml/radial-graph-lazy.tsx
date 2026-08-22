"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { RadialGraph } from "./radial-graph";

/**
 * `RadialGraph` behind a deferred import, for the reason given in
 * `graph-canvas-lazy.tsx`: cytoscape is the largest thing on this route and the
 * network it draws arrives from a client-side fetch, so nothing is waiting on it
 * at first paint. The investigation page has a full assessment to render above
 * the canvas, and that copy should not queue behind a renderer.
 */
const LazyRadialGraph = dynamic(
  () => import("./radial-graph").then((module) => module.RadialGraph),
  { ssr: false },
);

export function RadialGraphLazy(props: ComponentProps<typeof RadialGraph>) {
  return (
    <div className="size-full min-h-[380px]">
      <LazyRadialGraph {...props} />
    </div>
  );
}
