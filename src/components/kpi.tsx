import type { ReactNode } from "react";
import { cn } from "cn";
import { AppIcon, type AppIconName } from "@/components/icons";

export function Kpi({
  label,
  value,
  hint,
  tone = "secondary",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "primary" | "secondary" | "alert";
  icon?: AppIconName;
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-4 py-3",
        tone === "primary" && "bg-navy text-navy-foreground shadow-[var(--shadow-xs)]",
        tone === "secondary" && "bg-muted/80 text-navy",
        tone === "alert" && "bg-destructive/5 text-destructive ring-1 ring-destructive/15",
      )}
    >
      <p
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em]",
          tone === "primary" ? "text-white/70" : tone === "alert" ? "text-destructive/80" : "text-muted-foreground",
        )}
      >
        {icon ? <AppIcon name={icon} className="size-3.5" /> : null}
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-heading text-3xl tracking-tight",
          tone === "primary" ? "text-white" : tone === "alert" ? "text-destructive" : "text-navy",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className={cn("mt-1 text-xs", tone === "primary" ? "text-white/65" : "text-muted-foreground")}>{hint}</p>
      ) : null}
    </div>
  );
}

export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 sm:grid-cols-3", className)}>{children}</div>;
}
