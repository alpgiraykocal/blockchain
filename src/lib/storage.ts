/**
 * Browser storage naming, in one place.
 *
 * Everything the app keeps on the client - the theme choice, recent lookups and
 * the analyst's own tags - lives under a single prefix so a rename is one edit
 * rather than a hunt, and so nothing collides with another app on the origin.
 */

export const STORAGE_PREFIX = "blockchain-analysis";

/** Keys used before the app was renamed. Kept only to migrate away from. */
const LEGACY_PREFIX = "chainlens";

const MIGRATED_NAMES = ["theme", "recent", "user-tags"] as const;

export function storageKey(name: string): string {
  return `${STORAGE_PREFIX}.${name}`;
}

export function storageEvent(name: string): string {
  return `${STORAGE_PREFIX}:${name}`;
}

/**
 * Moves anything saved under the old prefix across, once.
 *
 * Renaming a storage key silently discards whatever the user had there. Local
 * analyst tags are hand-entered case work that exists nowhere else, so they are
 * carried over rather than dropped. Runs on import, before any store reads.
 */
function migrateLegacyKeys(): void {
  if (typeof window === "undefined") return;
  for (const name of MIGRATED_NAMES) {
    const legacy = `${LEGACY_PREFIX}.${name}`;
    const current = storageKey(name);
    try {
      const value = window.localStorage.getItem(legacy);
      if (value === null) continue;
      // Never overwrite something already saved under the new name.
      if (window.localStorage.getItem(current) === null) {
        window.localStorage.setItem(current, value);
      }
      window.localStorage.removeItem(legacy);
    } catch {
      // A blocked or full localStorage is not worth failing a page render over.
    }
  }
}

migrateLegacyKeys();
