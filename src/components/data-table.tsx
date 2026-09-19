import type { ReactNode } from "react";
import { cn } from "cn";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DataTable({
  children,
  caption,
  className,
  maxHeight = "70vh",
}: {
  children: ReactNode;
  caption?: string;
  className?: string;
  maxHeight?: string;
}) {
  return (
    <div
      className={cn("overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]", className)}
    >
      {caption ? (
        <p className="border-b px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {caption}
        </p>
      ) : null}
      <div className="overflow-auto" style={{ maxHeight }}>
        {children}
      </div>
    </div>
  );
}

export function StickyTableHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <TableHeader className={cn("sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--border)]", className)}>
      {children}
    </TableHeader>
  );
}

export { Table, TableBody, TableHead, TableRow };
