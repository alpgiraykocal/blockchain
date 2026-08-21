import Link from "next/link";
import { SearchX } from "lucide-react";
import { Panel } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <Panel>
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <SearchX className="size-7 text-foreground-muted" aria-hidden="true" />
        <h1 className="text-base font-semibold text-foreground">Page not found</h1>
        <p className="max-w-md text-xs leading-relaxed text-foreground-muted">
          That route does not exist. Addresses live at{" "}
          <code className="font-mono text-[11px]">/address/&lt;chain&gt;/&lt;address&gt;</code>.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex h-11 min-h-11 cursor-pointer items-center rounded-md bg-primary px-4 text-sm font-medium text-on-primary transition-[filter] duration-200 hover:brightness-110"
        >
          Back to dashboard
        </Link>
      </div>
    </Panel>
  );
}
