"use client";

import { createContext, useContext, useMemo } from "react";
import { type Locale, localePath } from "./config";
import type { Dictionary } from "./types";

/**
 * Locale and copy for client components.
 *
 * The dictionary arrives as a prop rather than being looked up here. The lookup
 * version imported the map of every locale, and because a bundler cannot narrow
 * a runtime key, that put both dictionaries - a little over 100 KB of source -
 * into the client bundle of every route, to use one of them.
 *
 * Interpolated copy is written as functions so each language can put its values
 * where its own grammar needs them, and functions cannot cross the server/client
 * boundary - React refuses to serialise them. So the prop is not passed from the
 * server layout either: `<LocaleProvider>` resolves the locale to a small client
 * module that imports exactly one dictionary, and only that module's chunk is
 * ever sent.
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
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, t: dictionary, href: (path: string) => localePath(locale, path) }),
    [locale, dictionary],
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
