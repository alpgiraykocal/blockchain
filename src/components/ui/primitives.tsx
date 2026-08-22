"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ button */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:brightness-110 active:brightness-95 border border-transparent",
  secondary:
    "bg-surface text-foreground border border-border-strong hover:bg-surface-2 active:bg-muted",
  ghost:
    "bg-transparent text-foreground-muted border border-transparent hover:bg-surface-2 hover:text-foreground",
  danger:
    "bg-transparent text-destructive border border-destructive/50 hover:bg-destructive/10",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  // 44px min height keeps every control inside the touch-target guideline.
  sm: "h-9 min-h-9 px-2.5 text-xs gap-1.5",
  md: "h-11 min-h-11 px-4 text-sm gap-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-md font-medium",
        "transition-[background-color,border-color,color,filter] duration-200 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-45",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="size-3.5" /> : null}
      {children}
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------- panel */

interface PanelProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Set when the panel body scrolls on its own (tables, graphs). */
  flush?: boolean;
  /** Lets a child escape the panel box - a search dropdown, a popover. Clipping
   *  is the right default for everything else. */
  overflowVisible?: boolean;
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  flush,
  overflowVisible,
}: PanelProps) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-lg border border-border bg-surface",
        overflowVisible ? "overflow-visible" : "overflow-hidden",
        className,
      )}
    >
      {(title || actions) && (
        // Wrapping rather than shrinking: a squeezed toolbar used to truncate the
        // panel title to "Transacti..." on narrow screens.
        <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-border px-4 py-3">
          <div className="min-w-[12rem] flex-1">
            {title ? (
              <h2 className="truncate text-sm font-semibold text-heading">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-foreground-muted">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2 max-sm:w-full">{actions}</div>
          ) : null}
        </header>
      )}
      <div
        className={cn(
          "min-w-0",
          flush ? "min-h-0 flex-1" : "min-h-0 flex-1 p-4",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- badge */

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "border-border-strong text-foreground-muted bg-surface-2",
  info: "border-info/40 text-info bg-info/10",
  success: "border-success/40 text-success bg-success/10",
  warning: "border-warning/40 text-warning bg-warning/10",
  danger: "border-destructive/45 text-destructive bg-destructive/10",
  accent: "border-accent/45 text-accent bg-accent/10",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  icon,
  title,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5",
        "text-[11px] font-medium leading-4",
        BADGE_TONES[tone],
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

/* --------------------------------------------------------------- states */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon ? <div className="text-foreground-muted">{icon}</div> : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-md text-xs leading-relaxed text-foreground-muted">{description}</p>
      ) : null}
      {/* Full width so a search field handed in as the action actually fills the
          space instead of collapsing to its intrinsic size. */}
      {action ? <div className="mt-2 w-full">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  detail,
  onRetry,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  const t = useT().ui.common;
  return (
    <div
      role="alert"
      className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-6 py-10 text-center"
    >
      <svg viewBox="0 0 24 24" className="size-6 text-destructive" aria-hidden="true">
        <path
          d="M12 8v5m0 3h.01M10.3 3.6 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-sm font-medium text-foreground">{title ?? t.couldNotLoad}</p>
      {detail ? (
        <p className="max-w-md break-words text-xs leading-relaxed text-foreground-muted">
          {detail}
        </p>
      ) : null}
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry} className="mt-2">
          {t.retry}
        </Button>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden="true" />;
}

/* --------------------------------------------------------------- misc */

export function InlineLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
}) {
  const classes = cn(
    "cursor-pointer text-secondary underline-offset-2 transition-colors duration-150 hover:text-primary hover:underline",
    className,
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}

/** Small definition row used across inspector panels. */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 py-1.5">
      <dt
        className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
        title={hint}
      >
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}
