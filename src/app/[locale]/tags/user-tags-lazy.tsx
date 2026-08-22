"use client";

import dynamic from "next/dynamic";

/**
 * `UserTagsPanel` behind a deferred import.
 *
 * It sits last on the page, below the pack list, the sanctions table and the
 * label feeds, and it is the one panel a visitor may never touch: it manages
 * tags the analyst wrote themselves, held in this browser. It also carries the
 * page's only zustand store and its persist middleware, plus the tag form.
 *
 * `ssr: false` because its entire content comes from localStorage, which the
 * server cannot see - a server pass renders the empty state and nothing else.
 * The placeholder holds a panel's worth of height so the swap shifts nothing
 * below it.
 */
const LazyUserTagsPanel = dynamic(
  () => import("./tags-client").then((module) => module.UserTagsPanel),
  { ssr: false, loading: () => <div className="skeleton h-64 rounded-lg" aria-hidden="true" /> },
);

export function UserTagsPanelLazy() {
  return <LazyUserTagsPanel />;
}
