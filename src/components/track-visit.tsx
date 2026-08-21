"use client";

import { useEffect } from "react";
import { pushRecent } from "@/components/search-bar";
import type { ChainId } from "@/lib/types";

/** Records the visited address in the local recent-search list. Stays client-side
 *  only — nothing about a lookup is sent anywhere but the block explorer. */
export function TrackVisit({ chain, address }: { chain: ChainId; address: string }) {
  useEffect(() => {
    pushRecent({ chain, address });
  }, [chain, address]);
  return null;
}
