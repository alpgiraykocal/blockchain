import { Suspense } from "react";
import type { Metadata } from "next";
import { ExplorerClient } from "./explorer-client";
import { Panel, Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Graph explorer",
  description:
    "Expand address and entity counterparties one hop at a time and trace transaction flow across Bitcoin and Ethereum.",
};

export default function ExplorerPage() {
  return (
    <Suspense fallback={<ExplorerSkeleton />}>
      <ExplorerClient />
    </Suspense>
  );
}

function ExplorerSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel flush className="min-h-[420px]">
          <Skeleton className="size-full min-h-[420px]" />
        </Panel>
        <Panel flush className="min-h-[420px]">
          <Skeleton className="size-full min-h-[420px]" />
        </Panel>
      </div>
    </div>
  );
}
