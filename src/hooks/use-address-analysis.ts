"use client";

import useSWR from "swr";
import type { AddressAnalysis } from "@/lib/analysis";
import { jsonFetcher } from "@/lib/fetcher";
import { useI18n } from "@/lib/i18n/context";
import type { ChainId } from "@/lib/types";

export function useAddressAnalysis(
  chain: ChainId | null,
  address: string | null,
  limit = 50,
) {
  // Risk signals come back as prose, so the request carries the language they
  // should be written in.
  const { locale } = useI18n();
  const key =
    chain && address
      ? `/api/address?${new URLSearchParams({ chain, address, limit: String(limit), locale })}`
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
