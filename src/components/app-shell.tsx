"use client";

import { LayoutDashboard, Monitor, Moon, Network, ScanSearch, Sun, Tags } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";
import { SearchBar } from "@/components/search-bar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useHeaderSearchVisible } from "@/components/primary-search";
import { useI18n } from "@/lib/i18n/context";
import { splitLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/investigate", key: "investigate", icon: ScanSearch },
  { href: "/explorer", key: "explorer", icon: Network },
  { href: "/tags", key: "tags", icon: Tags },
] as const;

/** Active state is decided on the path with the locale stripped, so /tr/tags and
 *  /en/tags both light up the same item. */
function isActive(pathname: string, href: string) {
  const { rest } = splitLocale(pathname);
  if (href === "/") return rest === "/";
  return rest === href || rest.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t, href: localeHref } = useI18n();
  // A page that owns a primary search field claims the slot; the header defers
  // rather than stacking a second identical input a few pixels away.
  const showHeaderSearch = useHeaderSearchVisible();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-on-primary"
      >
        {t.ui.nav.skipToContent}
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-3 px-3 sm:px-4">
          <Link
            href={localeHref("/")}
            className="flex shrink-0 cursor-pointer items-center gap-2 transition-opacity duration-150 hover:opacity-85"
          >
            <Logo />
            <span className="hidden text-sm font-semibold tracking-tight text-heading sm:inline">
              {t.ui.nav.brand}
            </span>
          </Link>

          {showHeaderSearch ? (
            <SearchBar className="mx-auto w-full max-w-xl" compact />
          ) : (
            <span className="flex-1" />
          )}

          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-0 px-0 sm:px-4">
        {/* Adaptive navigation: sidebar from lg up, bottom bar below. */}
        <nav
          aria-label={t.ui.nav.primaryLabel}
          className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-52 shrink-0 flex-col gap-1 border-r border-border py-4 pr-3 lg:flex"
        >
          {NAV.map(({ href, key, icon: Icon }) => {
            const active = isActive(pathname, href);
            const label = t.ui.nav[key];
            return (
              <Link
                key={href}
                href={localeHref(href)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 text-sm font-medium",
                  "transition-colors duration-200 ease-out",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-foreground-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="ml-auto h-5 w-0.5 rounded-full bg-primary"
                  />
                ) : null}
              </Link>
            );
          })}

          <div className="mt-auto space-y-1 rounded-md border border-border bg-surface-2/60 p-3 text-[11px] leading-relaxed text-foreground-muted">
            <p className="font-semibold text-foreground">{t.ui.nav.liveDataTitle}</p>
            <p>{t.ui.nav.liveDataBody}</p>
          </div>
        </nav>

        <main
          id="main"
          className="min-w-0 flex-1 px-3 pb-24 pt-4 sm:px-0 sm:pl-4 lg:pb-8"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label={t.ui.nav.primaryLabel}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-md">
          {NAV.map(({ href, key, icon: Icon }) => {
            const active = isActive(pathname, href);
            const label = t.ui.nav[key];
            return (
              <li key={href} className="flex-1">
                <Link
                  href={localeHref(href)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-14 min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                    "transition-colors duration-200",
                    active ? "text-primary" : "text-foreground-muted",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 text-primary" aria-hidden="true">
      <circle cx="12" cy="5" r="2.4" fill="currentColor" />
      <circle cx="5" cy="17" r="2.4" fill="currentColor" opacity="0.7" />
      <circle cx="19" cy="17" r="2.4" fill="currentColor" opacity="0.45" />
      <path
        d="M12 7.4 5.8 14.9M12 7.4l6.2 7.5M7.2 17.6h9.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

const THEME_OPTIONS = [
  { value: "light", key: "light", Icon: Sun },
  { value: "dark", key: "dark", Icon: Moon },
  { value: "system", key: "system", Icon: Monitor },
] as const satisfies readonly {
  value: string;
  key: keyof Pick<Dictionary["ui"]["theme"], "light" | "dark" | "system">;
  Icon: typeof Sun;
}[];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const active = THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[2];
  const next = THEME_OPTIONS[(THEME_OPTIONS.indexOf(active) + 1) % THEME_OPTIONS.length];
  const ActiveIcon = active.Icon;

  return (
    <>
      {/* Narrow headers cannot afford 3 buttons next to the search field, so the
          segmented control collapses into one that cycles through the modes. */}
      <button
        type="button"
        onClick={() => setTheme(next.value)}
        aria-label={t.ui.theme.cycle(t.ui.theme[active.key], t.ui.theme[next.key])}
        className="inline-flex size-11 min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-2 text-foreground-muted transition-colors duration-150 hover:text-foreground sm:hidden"
      >
        <ActiveIcon className="size-4" aria-hidden="true" />
      </button>

      <div
        role="group"
        aria-label={t.ui.theme.groupLabel}
        className="hidden shrink-0 items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5 sm:flex"
      >
        {THEME_OPTIONS.map(({ value, key, Icon }) => (
          <button
            key={value}
            type="button"
            aria-label={t.ui.theme[key]}
            title={t.ui.theme[key]}
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex size-8 cursor-pointer items-center justify-center rounded",
              "transition-colors duration-150",
              theme === value
                ? "bg-surface text-foreground shadow-sm"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        ))}
      </div>
    </>
  );
}
