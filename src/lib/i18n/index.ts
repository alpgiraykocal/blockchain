import { type Locale } from "./config";
import { en } from "./dictionaries/en";
import { tr } from "./dictionaries/tr";
import type { Dictionary } from "./types";

const DICTIONARIES: Record<Locale, Dictionary> = { en, tr };

/**
 * Both dictionaries are imported statically rather than loaded on demand.
 *
 * They are copy, not data - tens of kilobytes - and this runs in a single
 * long-lived Node process, so a dynamic import would trade a fixed, trivial
 * memory cost for a promise on the render path of every page. Only the active
 * locale ever reaches the browser: the server layout reads one and hands it to
 * the client provider as a prop, so neither dictionary is in the client bundle.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
export * from "./config";
