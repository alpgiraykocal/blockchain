import { Building2, Landmark, Pickaxe, ShieldAlert, Shuffle, Tag as TagIcon, Waypoints } from "lucide-react";
import type { ActorCategory, Tag } from "@/lib/types";
import { Badge } from "./primitives";

const CATEGORY_ICON: Record<ActorCategory, typeof TagIcon> = {
  exchange: Landmark,
  "mining-pool": Pickaxe,
  gambling: TagIcon,
  mixer: Shuffle,
  defi: Waypoints,
  bridge: Waypoints,
  merchant: Building2,
  "wallet-service": Building2,
  individual: TagIcon,
  unknown: TagIcon,
};

export function TagChip({ tag }: { tag: Tag }) {
  const Icon = tag.abuse === "none" ? CATEGORY_ICON[tag.category] : ShieldAlert;
  const tone =
    tag.abuse === "sanctions" || tag.abuse === "terrorism-financing"
      ? "danger"
      : tag.abuse !== "none"
        ? "warning"
        : tag.category === "exchange"
          ? "success"
          : "neutral";

  return (
    <Badge
      tone={tone}
      icon={<Icon className="size-3 shrink-0" aria-hidden="true" />}
      title={[
        `${tag.label} · ${tag.category}`,
        tag.abuse === "none" ? null : tag.abuse,
        `source: ${tag.pack}`,
        `confidence ${Math.round(tag.confidence * 100)}%`,
        tag.notes,
      ]
        .filter(Boolean)
        .join(" · ")}
    >
      {tag.label}
    </Badge>
  );
}
