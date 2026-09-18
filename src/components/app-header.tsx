"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSelection } from "@/components/selection-provider";

export function AppHeader({ current }: { current?: "directory" | "reports" | "blast" | "sync" }) {
  const { count } = useSelection();

  return (
    <header className="border-b border-white/10 bg-navy text-navy-foreground">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <Link href="/" className="block">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
              Georgetown Football
            </p>
            <h1 className="font-heading text-xl tracking-tight text-white sm:text-2xl">Georgetown Alum</h1>
          </Link>
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          <Link
            href="/"
            className={`rounded-md px-3 py-1.5 text-sm ${
              current === "directory" ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            Directory
          </Link>
          <Link
            href="/reports"
            className={`rounded-md px-3 py-1.5 text-sm ${
              current === "reports" ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            Reports
          </Link>
          <Link
            href="/blast"
            className={`rounded-md px-3 py-1.5 text-sm ${
              current === "blast" ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            Blast{count > 0 ? ` (${count})` : ""}
          </Link>
          <Link
            href="/sync"
            className={`rounded-md px-3 py-1.5 text-sm ${
              current === "sync" ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            Sync
          </Link>
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
