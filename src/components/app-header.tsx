"use client";

import Link from "next/link";
import { useOptionalSelectionCount } from "@/components/selection-provider";
import { Button } from "@/components/ui/button";
import { navItemsForRole, type NavKey } from "@/lib/nav";
import { roleLabel, type Role } from "@/lib/roles";

export function AppHeader({
  current,
  role,
  viewerLabel,
  shell,
}: {
  current?: NavKey;
  role?: Role;
  viewerLabel?: string;
  shell?: "staff" | "alum";
}) {
  const resolvedRole = role ?? (shell === "alum" ? "alum" : "owner");
  const count = useOptionalSelectionCount();
  const items = navItemsForRole(resolvedRole);
  const homeHref = resolvedRole === "alum" || resolvedRole === "board" ? "/portal" : "/";

  return (
    <header className="border-b border-white/10 bg-navy text-navy-foreground">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <Link href={homeHref} className="block">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
              Georgetown Football
            </p>
            <h1 className="font-heading text-xl tracking-tight text-white sm:text-2xl">
              {resolvedRole === "alum" || resolvedRole === "board" ? "Legacy Locker" : "Georgetown Alum"}
            </h1>
          </Link>
          <p className="mt-0.5 truncate text-[11px] text-white/55">
            {roleLabel(resolvedRole)}
            {viewerLabel ? ` · ${viewerLabel}` : ""}
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {items.map((item) => (
            <Link
              key={`${item.key}-${item.href}`}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm ${
                current === item.key ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
              {item.key === "blast" && count > 0 ? ` (${count})` : ""}
            </Link>
          ))}
          <form action="/api/logout" method="post">
            <Button
              type="submit"
              variant="ghost"
              className="h-8 px-3 text-white/80 hover:bg-white/10 hover:text-white"
            >
              Sign out
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
