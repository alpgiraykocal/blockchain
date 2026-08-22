import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvestigationClient } from "./investigation-client";
import { CHAINS, isChainId, isValidAddress } from "@/lib/chains/registry";
import { ErrorState, Panel } from "@/components/ui/primitives";
import { truncateAddress } from "@/lib/format";
import type { ChainId } from "@/lib/types";
import { getDictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/config";

interface PageProps {
  params: Promise<{ locale: string; chain: string; address: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, chain, address } = await params;
  const { ui } = getDictionary(isLocale(locale) ? locale : "en");
  if (!isChainId(chain)) return { title: ui.address.unknownChain };
  return {
    title: ui.graph.investigationMetaTitle(
      CHAINS[chain].ticker,
      truncateAddress(address, 8, 6),
    ),
    description: ui.graph.investigationMetaDescription,
  };
}

export default async function InvestigatePage({ params }: PageProps) {
  const { locale, chain: chainParam, address: rawAddress } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "en").ui.address;
  if (!isChainId(chainParam)) notFound();
  const chain: ChainId = chainParam;
  const address = decodeURIComponent(rawAddress);

  if (!isValidAddress(chain, address)) {
    return (
      <Panel>
        <ErrorState
          title={t.notValidTitle}
          detail={t.notValidDetail(address, CHAINS[chain].name)}
        />
      </Panel>
    );
  }

  return <InvestigationClient chain={chain} address={address} />;
}
