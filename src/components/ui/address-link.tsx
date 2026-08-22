"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { truncateAddress } from "@/lib/format";
import type { ChainId } from "@/lib/types";

export function AddressLink({
  chain,
  address,
  label,
  className,
  truncate = true,
  head = 8,
  tail = 6,
}: {
  chain: ChainId;
  address: string;
  label?: string | null;
  className?: string;
  truncate?: boolean;
  head?: number;
  tail?: number;
}) {
  const { href } = useI18n();
  const display = truncate ? truncateAddress(address, head, tail) : address;
  return (
    <Link
      href={href(`/address/${chain}/${address}`)}
      title={label ? `${label} — ${address}` : address}
      className={cn(
        "cursor-pointer whitespace-nowrap font-mono text-[13px] text-secondary underline-offset-2",
        "transition-colors duration-150 hover:text-primary hover:underline",
        className,
      )}
    >
      {label ? (
        <span className="font-sans font-medium text-foreground">{label}</span>
      ) : (
        display
      )}
    </Link>
  );
}
