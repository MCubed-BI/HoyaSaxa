import Link from "next/link";
import { Button } from "@/components/ui/button";
import { portalMoreItems, portalNavItems, type NavKey } from "@/lib/nav";
import { roleLabel, type Role } from "@/lib/roles";
import type { Viewer } from "@/lib/viewer";

export function PortalShell({
  viewer,
  current,
  children,
}: {
  viewer: Viewer;
  current?: NavKey;
  children: React.ReactNode;
}) {
  const primary = portalNavItems();
  const more = portalMoreItems(viewer.role);

  return (
    <div className="legacy-locker flex min-h-full flex-col">
      <header className="border-b border-gold/25">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/portal" className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-gold">
              Georgetown Football
            </p>
            <h1 className="font-heading text-2xl tracking-tight text-white">Legacy Locker</h1>
            <p className="mt-0.5 truncate text-[11px] text-white/55">
              {roleLabel(viewer.role)} · {viewer.label}
            </p>
          </Link>
          <nav className="hidden flex-wrap items-center justify-end gap-1 md:flex">
            {primary.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  current === item.key ? "bg-gold text-gold-foreground" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <form action="/api/logout" method="post">
              <Button type="submit" variant="ghost" className="h-8 px-3 text-white/80 hover:bg-white/10 hover:text-white">
                Sign out
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 pb-24 sm:px-6">{children}</main>
      <MoreLinks items={more} role={viewer.role} />
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gold/25 bg-[#071428]/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-5">
          {primary.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`px-2 py-3 text-center text-[11px] uppercase tracking-wide ${
                current === item.key ? "text-gold" : "text-white/65"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function MoreLinks({ items, role }: { items: ReturnType<typeof portalMoreItems>; role: Role }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-3 px-4 pb-8 text-xs text-white/50 sm:px-6">
      {items.map((item) => (
        <Link key={item.key} href={item.href} className="hover:text-gold">
          {item.label}
        </Link>
      ))}
      {role === "board" ? <span>Board can publish Newsflash</span> : null}
    </div>
  );
}
