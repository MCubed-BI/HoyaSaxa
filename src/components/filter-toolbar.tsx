import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "cn";
import { AppIcon } from "@/components/icons";

export function FilterToolbar({
  children,
  chips,
  summary,
  className,
}: {
  children: ReactNode;
  chips?: ReactNode;
  summary?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-20 z-20 space-y-3 rounded-xl border bg-card/95 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
      {chips}
      {summary}
    </div>
  );
}

export function FilterChip({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-navy ring-1 ring-border hover:bg-secondary"
    >
      {children}
      <span aria-hidden className="text-muted-foreground">
        ×
      </span>
    </Link>
  );
}

export function FilterChipRow({
  label = "Active filters",
  children,
  clearHref,
}: {
  label?: string;
  children: ReactNode;
  clearHref?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <AppIcon name="filter" className="size-3.5" />
        {label}
      </span>
      {children}
      {clearHref ? (
        <Link href={clearHref} className="text-xs font-medium text-navy hover:underline">
          Clear all
        </Link>
      ) : null}
    </div>
  );
}
