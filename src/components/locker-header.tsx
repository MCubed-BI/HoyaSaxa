import Link from "next/link";
import { Button } from "@/components/ui/button";
import { portalMoreItems, portalNavItems, type NavKey } from "@/lib/nav";
import type { LockerViewer } from "@/lib/locker-viewer";

export function LockerHeader({
  current,
  viewer,
}: {
  current?: NavKey;
  viewer?: LockerViewer | null;
}) {
  const primary = portalNavItems();
  const more = viewer ? portalMoreItems(viewer.role === "coach" ? "coach" : viewer.role) : [];

  return (
    <header className="border-b border-white/10 bg-navy text-navy-foreground">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/home" className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
            Georgetown Football
          </p>
          <h1 className="font-heading text-xl tracking-tight text-white sm:text-2xl">Legacy Locker</h1>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {primary.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm ${
                current === item.key
                  ? "bg-white/15 text-white"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {more
            .filter((item) => item.key === "feed" || item.key === "newsflash")
            .map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`hidden rounded-md px-3 py-1.5 text-sm sm:inline ${
                  current === item.key
                    ? "bg-white/15 text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          {viewer ? (
            <span className="hidden text-xs text-white/55 lg:inline">
              {viewer.label} · {viewer.roleLabel}
            </span>
          ) : null}
          {viewer ? (
            <form action="/api/logout" method="post">
              <Button
                type="submit"
                variant="ghost"
                className="h-8 px-3 text-white/80 hover:bg-white/10 hover:text-white"
              >
                Sign out
              </Button>
            </form>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
