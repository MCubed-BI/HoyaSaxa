"use client";

import { ProductHeader } from "@/components/product-header";
import { useOptionalSelectionCount } from "@/components/selection-provider";
import { navItemsForRole, portalSecondaryItems, type NavKey } from "@/lib/nav";
import { roleLabel, type Role } from "@/lib/roles";

function fromForNav(current?: NavKey, role?: Role) {
  if (current === "blast") return role === "alum" || role === "board" ? "/portal/blast" : "/blast";
  if (current === "newsflash" || current === "board") return "/board";
  if (current === "feed") return "/feed";
  if (current === "home") return "/home";
  if (current === "portal-directory" || current === "profile") return "/directory";
  if (current === "messages") return "/messages";
  return role === "alum" || role === "board" ? "/portal" : "/";
}

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
  const items = navItemsForRole(resolvedRole).map((item) =>
    item.key === "blast" && count > 0 ? { ...item, label: `${item.label} (${count})` } : item,
  );
  const homeHref = resolvedRole === "alum" || resolvedRole === "board" ? "/portal" : "/";
  const isAlumShell = resolvedRole === "alum" || resolvedRole === "board";

  return (
    <ProductHeader
      homeHref={homeHref}
      items={items}
      secondaryItems={isAlumShell ? portalSecondaryItems() : []}
      current={current}
      roleLabel={roleLabel(resolvedRole)}
      viewerLabel={viewerLabel}
      showSignOut
      signOutFrom={fromForNav(current, resolvedRole)}
      mobileNav={isAlumShell ? "tabs" : "scroll"}
    />
  );
}
