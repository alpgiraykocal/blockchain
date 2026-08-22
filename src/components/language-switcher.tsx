"use client";

import { Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { LOCALES, LOCALE_NAMES, localePath, splitLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Language switcher.
 *
 * Swaps the locale segment of the current path rather than sending the visitor
 * home, so changing language keeps the address, the investigation or the tab
 * they were already looking at.
 *
 * It does not write the preference cookie itself: the middleware already syncs
 * that cookie from whatever locale the URL carries, and this navigation goes
 * through the middleware like any other. One writer instead of two means the
 * two can never disagree.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (next: (typeof LOCALES)[number]) => {
    if (next === locale) return;
    const { rest } = splitLocale(pathname);
    router.push(localePath(next, rest));
    // The layout above this component is locale-scoped, so the copy it already
    // rendered has to be re-fetched rather than reused from the router cache.
    router.refresh();
  };

  return (
    <div
      role="group"
      aria-label={t.ui.language.label}
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5",
        className,
      )}
    >
      <Languages
        className="ml-1 hidden size-3.5 text-foreground-muted sm:block"
        aria-hidden="true"
      />
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          aria-pressed={code === locale}
          aria-label={t.ui.language.switchTo(LOCALE_NAMES[code])}
          title={LOCALE_NAMES[code]}
          className={cn(
            "inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded px-1.5",
            "text-[11px] font-semibold uppercase transition-colors duration-150",
            code === locale
              ? "bg-surface text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
