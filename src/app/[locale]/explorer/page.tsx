import { Suspense } from "react";
import type { Metadata } from "next";
import { ExplorerClient } from "./explorer-client";
import { Panel, Skeleton } from "@/components/ui/primitives";
import { getDictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { ui } = getDictionary(isLocale(locale) ? locale : "en");
  return { title: ui.graph.metaTitle, description: ui.graph.metaDescription };
}

/* Rendered per request rather than prerendered: the CSP carries a per-request
 * nonce, and Next cannot stamp one onto HTML built at compile time - a
 * prerendered page under this policy would render and never hydrate. The cost is
 * small because these pages fetch their data client-side; the expensive work
 * sits in the API routes and their caches.
 */
export const dynamic = "force-dynamic";

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
