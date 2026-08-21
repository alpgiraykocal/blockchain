import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvestigationClient } from "./investigation-client";
import { CHAINS, isChainId, isValidAddress } from "@/lib/chains/registry";
import { ErrorState, Panel } from "@/components/ui/primitives";
import { truncateAddress } from "@/lib/format";
import type { ChainId } from "@/lib/types";

interface PageProps {
  params: Promise<{ chain: string; address: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { chain, address } = await params;
  if (!isChainId(chain)) return { title: "Unknown chain" };
  return {
    title: `Investigation · ${CHAINS[chain].ticker} ${truncateAddress(address, 8, 6)}`,
    description:
      "AML/CTF investigation workspace: ego-network analysis, typology findings, triage disposition and a draft case file.",
  };
}

export default async function InvestigatePage({ params }: PageProps) {
  const { chain: chainParam, address: rawAddress } = await params;
  if (!isChainId(chainParam)) notFound();
  const chain: ChainId = chainParam;
  const address = decodeURIComponent(rawAddress);

  if (!isValidAddress(chain, address)) {
    return (
      <Panel>
        <ErrorState
          title="Not a valid address"
          detail={`"${address}" is not a recognised ${CHAINS[chain].name} address.`}
        />
      </Panel>
    );
  }

  return <InvestigationClient chain={chain} address={address} />;
}
