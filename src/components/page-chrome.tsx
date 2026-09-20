import type { ReactNode } from "react";
import { cn } from "cn";

const WIDTHS = {
  default: "max-w-6xl",
  narrow: "max-w-3xl",
  form: "max-w-2xl",
  record: "max-w-4xl",
} as const;

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex min-h-full flex-col", className)}>{children}</div>;
}

export function PageMain({
  children,
  width = "default",
  className,
}: {
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 sm:px-6",
        WIDTHS[width],
        className,
      )}
    >
      {children}
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <p className="app-kicker text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h2 className="font-heading text-[1.65rem] leading-tight text-navy sm:text-[1.8rem]">{title}</h2>
        {description ? <div className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</div> : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Notice({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "danger" | "success";
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "danger" && "border-destructive/20 bg-destructive/5 text-destructive",
        tone === "success" && "border-navy/10 bg-navy/[0.04] text-navy",
        tone === "muted" && "border-border bg-card text-muted-foreground shadow-[var(--shadow-xs)]",
      )}
    >
      {children}
    </div>
  );
}

export function pillClass(active: boolean) {
  return cn(
    "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
    active
      ? "bg-navy text-navy-foreground shadow-[var(--shadow-xs)]"
      : "bg-card text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground",
  );
}
