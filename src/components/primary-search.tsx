"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Only one search field should be the primary one on screen.
 *
 * Landing and empty states own a large search field as their call to action.
 * The header carries a global one. Rendering both put two identical inputs a few
 * pixels apart, which reads as a mistake rather than as convenience. A page that
 * owns a primary search registers it here and the header stands down - without
 * hard-coding a route list that would drift the moment a page changes.
 */

interface PrimarySearchValue {
  claimed: boolean;
  claim: () => () => void;
}

const PrimarySearchContext = createContext<PrimarySearchValue | null>(null);

export function PrimarySearchProvider({ children }: { children: React.ReactNode }) {
  const [claims, setClaims] = useState(0);

  const value = useMemo<PrimarySearchValue>(
    () => ({
      claimed: claims > 0,
      claim: () => {
        setClaims((count) => count + 1);
        return () => setClaims((count) => Math.max(0, count - 1));
      },
    }),
    [claims],
  );

  return (
    <PrimarySearchContext.Provider value={value}>{children}</PrimarySearchContext.Provider>
  );
}

/** Called by a page that renders its own primary search field. */
export function useClaimPrimarySearch(active = true): void {
  const context = useContext(PrimarySearchContext);
  const claim = context?.claim;

  useEffect(() => {
    if (!active || !claim) return;
    return claim();
  }, [active, claim]);
}

export function useHeaderSearchVisible(): boolean {
  return !useContext(PrimarySearchContext)?.claimed;
}
