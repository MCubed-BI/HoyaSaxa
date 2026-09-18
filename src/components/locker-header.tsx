import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { LockerViewer } from "@/lib/locker-viewer";

const NAV = [
  { href: "/home", key: "home", label: "Home" },
  { href: "/feed", key: "feed", label: "For You" },
  { href: "/newsflash", key: "newsflash", label: "Newsflash" },
] as const;

export function LockerHeader({
  current,
  viewer,
}: {
  current?: (typeof NAV)[number]["key"];
  viewer?: LockerViewer | null;
}) {
  return (
    <header className="border-b border-gold/25 bg-navy text-navy-foreground">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/home" className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold">
            Hoya Football
          </p>
          <h1 className="font-heading text-xl tracking-tight text-white sm:text-2xl">
            Legacy Locker
          </h1>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm ${
                current === item.key
                  ? "bg-gold/20 text-gold"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {viewer ? (
            <span className="hidden text-xs text-white/55 sm:inline">
              {viewer.label} · {viewer.roleLabel}
            </span>
          ) : null}
          {viewer ? (
            <form action="/api/locker/logout" method="post">
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
