"use client";

import useSWR from "swr";
import type { AddressAnalysis } from "@/lib/analysis";
import { jsonFetcher } from "@/lib/fetcher";
import type { ChainId } from "@/lib/types";

export function useAddressAnalysis(
  chain: ChainId | null,
  address: string | null,
  limit = 50,
) {
  const key =
    chain && address
      ? `/api/address?${new URLSearchParams({ chain, address, limit: String(limit) })}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<AddressAnalysis>(key, jsonFetcher, {
    revalidateOnFocus: false,
    keepPreviousData: false,
    dedupingInterval: 30_000,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: () => void mutate(),
  };
}
