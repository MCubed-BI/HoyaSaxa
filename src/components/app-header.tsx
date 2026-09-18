"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useOptionalSelectionCount } from "@/components/selection-provider";

export function AppHeader({
  current,
  shell = "staff",
}: {
  current?: "directory" | "reports" | "blast" | "sync" | "messages";
  shell?: "staff" | "alum";
}) {
  const count = useOptionalSelectionCount();
  const homeHref = shell === "alum" ? "/messages" : "/";

  return (
    <header className="border-b border-white/10 bg-navy text-navy-foreground">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <Link href={homeHref} className="block">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
              Georgetown Football
            </p>
            <h1 className="font-heading text-xl tracking-tight text-white sm:text-2xl">Georgetown Alum</h1>
          </Link>
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {shell === "staff" ? (
            <>
              <NavLink href="/" active={current === "directory"}>
                Directory
              </NavLink>
              <NavLink href="/messages" active={current === "messages"}>
                Messages
              </NavLink>
              <NavLink href="/reports" active={current === "reports"}>
                Reports
              </NavLink>
              <NavLink href="/blast" active={current === "blast"}>
                Blast{count > 0 ? ` (${count})` : ""}
              </NavLink>
              <NavLink href="/sync" active={current === "sync"}>
                Sync
              </NavLink>
            </>
          ) : (
            <NavLink href="/messages" active={current === "messages"}>
              Messages
            </NavLink>
          )}
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

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm ${
        active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
