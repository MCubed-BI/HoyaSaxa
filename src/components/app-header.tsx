"use client";

import { ProductHeader } from "@/components/product-header";
import { useOptionalSelectionCount } from "@/components/selection-provider";
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
  const items = navItemsForRole(resolvedRole).map((item) =>
    item.key === "blast" && count > 0 ? { ...item, label: `${item.label} (${count})` } : item,
  );
  const homeHref = resolvedRole === "alum" || resolvedRole === "board" ? "/portal" : "/";
  const isAlumShell = resolvedRole === "alum" || resolvedRole === "board";

  return (
    <ProductHeader
      homeHref={homeHref}
      items={items}
      current={current}
      roleLabel={roleLabel(resolvedRole)}
      viewerLabel={viewerLabel}
      showSignOut
      mobileNav={isAlumShell ? "tabs" : "scroll"}
    />
  );
}
