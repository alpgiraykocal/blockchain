"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { type Locale, localePath } from "./config";
import { getDictionary } from "./index";
import type { Dictionary } from "./types";

/**
 * Locale and copy for client components.
 *
 * The provider looks the dictionary up from the locale rather than receiving it
 * as a prop. Interpolated copy is written as functions so each language can put
 * its values where its own grammar needs them, and functions cannot cross the
 * server/client boundary - React refuses to serialise them. Passing the string
 * `"tr"` and resolving it here sidesteps that entirely.
 *
 * The cost is that both dictionaries are in the client bundle. They are copy,
 * not data, and gzip to a few kilobytes each - far less than the render-blocking
 * chart library that used to sit on this path.
 */

interface I18nValue {
  locale: Locale;
  t: Dictionary;
  /** Prefixes an app route with the active locale. */
  href: (path: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const href = useCallback((path: string) => localePath(locale, path), [locale]);

  const value = useMemo<I18nValue>(
    () => ({ locale, t: getDictionary(locale), href }),
    [locale, href],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside <I18nProvider>.");
  }
  return context;
}

/** Shorthand for the common case of only needing the copy. */
export function useT(): Dictionary {
  return useI18n().t;
}
