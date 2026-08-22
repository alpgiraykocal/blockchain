"use client";

import { Download, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { TagForm } from "./tag-form";
import { AddressLink } from "@/components/ui/address-link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TagChip } from "@/components/ui/tag-chip";
import { Badge, Button, EmptyState, Panel } from "@/components/ui/primitives";
import { formatRelative } from "@/lib/format";
import { useI18n } from "@/lib/i18n/context";
import { parseTagExport, useUserTags } from "@/lib/tags/user-store";
import type { Tag } from "@/lib/types";

export function UserTagsPanel() {
  const { t: dict, locale } = useI18n();
  const t = dict.ui.tags;
  const tags = useUserTags((state) => state.tags);
  const remove = useUserTags((state) => state.remove);
  const replaceAll = useUserTags((state) => state.replaceAll);
  const clear = useUserTags((state) => state.clear);

  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const exportUrl = useMemo(() => {
    if (typeof window === "undefined") return null;
    const payload = {
      title: t.exportName,
      creator: "local",
      lastmod: new Date().toISOString().slice(0, 10),
      tags,
    };
    return URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    );
  }, [tags, t]);

  const columns: Column<Tag>[] = [
    {
      key: "label",
      header: t.colTag,
      cell: (tag) => <TagChip tag={tag} />,
      sortValue: (tag) => tag.label,
    },
    {
      key: "subject",
      header: t.colAddress,
      cell: (tag) => <AddressLink chain={tag.chain} address={tag.subject} head={10} tail={8} />,
      sortValue: (tag) => tag.subject,
    },
    {
      key: "chain",
      header: t.colChain,
      cell: (tag) => <Badge tone="neutral">{tag.chain.toUpperCase()}</Badge>,
      sortValue: (tag) => tag.chain,
    },
    {
      key: "abuse",
      header: t.colAbuse,
      cell: (tag) =>
        tag.abuse === "none" ? (
          <span className="text-foreground-muted">—</span>
        ) : (
          <Badge tone="danger">{tag.abuse}</Badge>
        ),
      sortValue: (tag) => tag.abuse,
    },
    {
      key: "confidence",
      header: t.colConfidence,
      align: "right",
      cell: (tag) => `${Math.round(tag.confidence * 100)}%`,
      sortValue: (tag) => tag.confidence,
    },
    {
      key: "created",
      header: t.colAdded,
      align: "right",
      cell: (tag) => formatRelative(tag.createdAt, locale),
      sortValue: (tag) => new Date(tag.createdAt).getTime(),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (tag) => (
        <Button
          size="sm"
          variant="danger"
          aria-label={t.deleteTag(tag.label)}
          onClick={() => {
            remove(tag.id);
            setNotice({ tone: "ok", message: t.deleted(tag.label) });
          }}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </Button>
      ),
    },
  ];

  const importFile = async (file: File) => {
    try {
      const parsed = parseTagExport(JSON.parse(await file.text()));
      replaceAll(parsed);
      setNotice({ tone: "ok", message: t.imported(parsed.length) });
    } catch (error) {
      setNotice({
        tone: "error",
        message: t.importFailed(
          error instanceof Error ? error.message : t.importUnreadable,
        ),
      });
    }
  };

  return (
    <div className="space-y-4">
      <Panel
        title={t.yourTags}
        description={t.yourTagsDescription}
        actions={
          <div className="flex items-center gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importFile(file);
                event.target.value = "";
              }}
            />
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="size-3.5" aria-hidden="true" />
              {t.importAction}
            </Button>
            {exportUrl && tags.length ? (
              <a
                href={exportUrl}
                download="blockchain-analysis-tags.json"
                className="inline-flex h-9 min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border-strong px-2.5 text-xs font-medium text-foreground transition-colors duration-200 hover:bg-surface-2"
              >
                <Download className="size-3.5" aria-hidden="true" />
                {t.exportAction}
              </a>
            ) : null}
            {tags.length ? (
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    setTimeout(() => setConfirmClear(false), 4000);
                    return;
                  }
                  clear();
                  setConfirmClear(false);
                  setNotice({ tone: "ok", message: t.allRemoved });
                }}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                {confirmClear ? t.confirmDeleteAll : t.deleteAll}
              </Button>
            ) : null}
          </div>
        }
      >
        {notice ? (
          <p
            role="status"
            aria-live="polite"
            className={
              notice.tone === "ok"
                ? "mb-3 rounded border border-success/40 bg-success/10 px-2.5 py-2 text-xs text-success"
                : "mb-3 rounded border border-destructive/45 bg-destructive/10 px-2.5 py-2 text-xs text-destructive"
            }
          >
            {notice.message}
          </p>
        ) : null}

        <DataTable
          rows={tags}
          columns={columns}
          rowKey={(tag) => tag.id}
          caption={t.localTagsCaption}
          initialSort={{ key: "created", direction: "desc" }}
          emptyState={
            <EmptyState
              title={t.noLocalTags}
              description={t.noLocalTagsBody}
            />
          }
        />
      </Panel>

      <Panel title={t.addTag} description={t.addTagDescription}>
        <TagForm />
      </Panel>
    </div>
  );
}
