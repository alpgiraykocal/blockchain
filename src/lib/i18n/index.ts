import { type Locale } from "./config";
import { en } from "./dictionaries/en";
import { tr } from "./dictionaries/tr";
import type { Dictionary } from "./types";

const DICTIONARIES: Record<Locale, Dictionary> = { en, tr };

/**
 * Server-side dictionary lookup. Both locales are imported statically, which is
 * right here: this runs in a single long-lived Node process, so holding a few
 * tens of kilobytes of copy costs nothing a dynamic import would recover, and it
 * keeps a promise off the render path of every page.
 *
 * This module is server-only in practice. Importing it from a client component
 * defeats the split in `locale-provider.tsx` and puts every locale's copy in
 * that route's bundle - which is what it used to do. Client code takes its copy
 * from `useT()`.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
export * from "./config";
