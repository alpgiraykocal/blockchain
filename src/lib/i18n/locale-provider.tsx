"use client";

import dynamic from "next/dynamic";
import type { Locale } from "./config";

/**
 * Picks the client provider for the active locale.
 *
 * The two providers are behind `next/dynamic` so each dictionary lands in its
 * own chunk and a page only ever downloads the language it is being served in.
 * A plain conditional import does not achieve this: both branches stay reachable
 * from this route's client graph, the bundler cannot narrow a runtime value, and
 * both dictionaries end up in the same initial chunk - which is what happened
 * before, at about 36 KB gzipped on every page, to use half of it.
 *
 * SSR is deliberately left on. The server still renders the whole tree with real
 * copy, so the HTML is complete and translated before any of this loads; only
 * hydration waits on the chunk, exactly as it would for a static import.
 */
const EnProvider = dynamic(() => import("./provider-en").then((m) => m.EnProvider));
const TrProvider = dynamic(() => import("./provider-tr").then((m) => m.TrProvider));

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const Provider = locale === "tr" ? TrProvider : EnProvider;
  return <Provider>{children}</Provider>;
}
