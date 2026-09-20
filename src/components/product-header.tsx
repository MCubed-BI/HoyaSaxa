"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { NavIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { type NavItem, type NavKey } from "@/lib/nav";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";
import { cn } from "cn";

function shortLabel(item: NavItem) {
  if (item.key === "find-my-alum") return "Map";
  if (item.key === "board") return "Board";
  if (item.key === "alum") return "Portal";
  return item.label;
}

export function ProductHeader({
  homeHref,
  items,
  current,
  roleLabel,
  viewerLabel,
  secondaryItems = [],
  showSignOut = false,
  signOutAction = "/api/logout",
  signOutFrom,
  mobileNav = "scroll",
  trailing,
}: {
  homeHref: string;
  items: NavItem[];
  current?: NavKey;
  roleLabel?: string;
  viewerLabel?: string;
  secondaryItems?: NavItem[];
  showSignOut?: boolean;
  signOutAction?: string;
  signOutFrom?: string;
  mobileNav?: "none" | "scroll" | "tabs";
  trailing?: ReactNode;
}) {
  const desktopItems = [...items, ...secondaryItems];
  const tabItems = items.slice(0, 5);
  const stacked = mobileNav === "scroll" && desktopItems.length > 0;

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-card shadow-[var(--shadow-xs)]">
        <div className="h-0.5 w-full bg-navy">
          <div className="h-full w-16 bg-silver" />
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="flex items-center gap-3 overflow-visible py-2.5">
            <div className="@container/brand min-w-[11rem] flex-1">
              <BrandMark href={homeHref} compact title={PRODUCT_DISPLAY_NAME} />
            </div>
            {!stacked && desktopItems.length > 0 ? (
              <nav className="hidden min-w-0 flex-1 items-center justify-end gap-0.5 md:flex" aria-label="Primary">
                {desktopItems.map((item) => (
                  <NavLink key={`${item.key}-${item.href}`} item={item} current={current} />
                ))}
              </nav>
            ) : (
              <div className="min-w-0 flex-1" />
            )}
            <div className="flex shrink-0 items-center gap-2">
              {roleLabel ? (
                <span className="hidden max-w-44 truncate rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:inline">
                  {roleLabel}
                  {viewerLabel ? ` · ${viewerLabel}` : ""}
                </span>
              ) : null}
              {trailing}
              {showSignOut ? (
                <form action={signOutAction} method="post">
                  {signOutFrom ? <input type="hidden" name="from" value={signOutFrom} /> : null}
                  <Button type="submit" variant="ghost" className="h-8 px-2.5 text-muted-foreground hover:text-foreground">
                    Sign out
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
          {stacked ? (
            <nav className="-mx-1 flex items-center gap-0.5 overflow-x-auto border-t py-1.5" aria-label="Primary">
              {desktopItems.map((item) => (
                <NavLink key={`${item.key}-${item.href}`} item={item} current={current} compact />
              ))}
            </nav>
          ) : null}
        </div>
      </header>
      {mobileNav === "tabs" ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-card)] md:hidden"
          aria-label="Primary"
        >
          <div className="mx-auto grid max-w-6xl grid-cols-5">
            {tabItems.map((item) => {
              const active = current === item.key;
              return (
                <Link
                  key={`${item.key}-${item.href}`}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium uppercase tracking-wide",
                    active ? "text-navy" : "text-muted-foreground",
                  )}
                >
                  <NavIcon navKey={item.key} className="size-4" />
                  {shortLabel(item)}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </>
  );
}

function NavLink({
  item,
  current,
  compact = false,
}: {
  item: NavItem;
  current?: NavKey;
  compact?: boolean;
}) {
  const active = current === item.key;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg text-sm font-medium transition-colors",
        compact ? "gap-1 px-2 py-1.5" : "gap-1.5 px-2.5 py-1.5",
        active ? "bg-navy text-white shadow-[var(--shadow-xs)]" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <NavIcon navKey={item.key} className="size-3.5" />
      <span>{compact ? shortLabel(item) : item.label}</span>
    </Link>
  );
}
