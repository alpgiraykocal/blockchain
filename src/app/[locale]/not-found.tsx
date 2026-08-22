"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";
import { Panel } from "@/components/ui/primitives";
import { useI18n } from "@/lib/i18n/context";

export default function NotFound() {
  const { t, href } = useI18n();

  return (
    <Panel>
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <SearchX className="size-7 text-foreground-muted" aria-hidden="true" />
        <h1 className="text-base font-semibold text-foreground">{t.ui.notFound.title}</h1>
        <p className="max-w-md text-xs leading-relaxed text-foreground-muted">
          {t.ui.notFound.bodyBefore}
          <code className="font-mono text-[11px]">/address/&lt;chain&gt;/&lt;address&gt;</code>
          {t.ui.notFound.bodyAfter}
        </p>
        <Link
          href={href("/")}
          className="mt-2 inline-flex h-11 min-h-11 cursor-pointer items-center rounded-md bg-primary px-4 text-sm font-medium text-on-primary transition-[filter] duration-200 hover:brightness-110"
        >
          {t.ui.notFound.back}
        </Link>
      </div>
    </Panel>
  );
}
