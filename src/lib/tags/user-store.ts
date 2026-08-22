"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { storageKey } from "../storage";
import type { AbuseType, ActorCategory, ChainId, Tag } from "../types";

export interface UserTagDraft {
  chain: ChainId;
  subject: string;
  label: string;
  category: ActorCategory;
  abuse: AbuseType;
  confidence: number;
  notes?: string;
}

interface UserTagState {
  tags: Tag[];
  add: (draft: UserTagDraft) => Tag;
  remove: (id: string) => void;
  replaceAll: (tags: Tag[]) => void;
  clear: () => void;
}

/** User tags never leave the browser — the same guarantee GraphSense's dashboard
 *  makes about analyst annotations. */
export const useUserTags = create<UserTagState>()(
  persist(
    (set, get) => ({
      tags: [],

      add: (draft) => {
        const tag: Tag = {
          id: `user:${draft.chain}:${draft.subject.toLowerCase()}:${Date.now()}`,
          chain: draft.chain,
          subject: draft.subject,
          label: draft.label,
          category: draft.category,
          abuse: draft.abuse,
          confidence: draft.confidence,
          source: "user",
          pack: "local-analyst",
          createdAt: new Date().toISOString(),
          notes: draft.notes,
        };
        set({ tags: [tag, ...get().tags] });
        return tag;
      },

      remove: (id) => set({ tags: get().tags.filter((tag) => tag.id !== id) }),
      replaceAll: (tags) => set({ tags }),
      clear: () => set({ tags: [] }),
    }),
    { name: storageKey("user-tags") },
  ),
);

export const ACTOR_CATEGORIES: ActorCategory[] = [
  "exchange",
  "mining-pool",
  "gambling",
  "mixer",
  "defi",
  "bridge",
  "merchant",
  "wallet-service",
  "token",
  "individual",
  "unknown",
];

export const ABUSE_TYPES: AbuseType[] = [
  "none",
  "sanctions",
  "ransomware",
  "scam",
  "darknet-market",
  "mixer",
  "theft",
  "terrorism-financing",
];

/** Validates a parsed TagPack export before it replaces local state. */
/** `notJsonObject` is passed in rather than looked up: this is a client module,
 *  and a dictionary lookup here would bundle every locale's copy with it. */
export function parseTagExport(input: unknown, notJsonObject = "File is not a JSON object."): Tag[] {
  if (!input || typeof input !== "object") throw new Error(notJsonObject);
  const candidate = (input as { tags?: unknown }).tags;
  if (!Array.isArray(candidate)) throw new Error("Missing a top-level `tags` array.");

  return candidate.map((entry, index) => {
    const tag = entry as Partial<Tag>;
    if (!tag.subject || typeof tag.subject !== "string") {
      throw new Error(`Entry ${index + 1} has no \`subject\` address.`);
    }
    if (!tag.label || typeof tag.label !== "string") {
      throw new Error(`Entry ${index + 1} has no \`label\`.`);
    }
    if (tag.chain !== "btc" && tag.chain !== "eth") {
      throw new Error(`Entry ${index + 1} has an unsupported \`chain\`.`);
    }
    return {
      id: tag.id ?? `import:${tag.chain}:${tag.subject}:${index}`,
      chain: tag.chain,
      subject: tag.subject,
      label: tag.label,
      category: (tag.category as ActorCategory) ?? "unknown",
      abuse: (tag.abuse as AbuseType) ?? "none",
      confidence:
        typeof tag.confidence === "number" ? Math.max(0, Math.min(1, tag.confidence)) : 0.5,
      source: "user",
      pack: tag.pack ?? "imported",
      createdAt: tag.createdAt ?? new Date().toISOString(),
      notes: tag.notes,
    } satisfies Tag;
  });
}
