"use client";

import { ProductHeader } from "@/components/product-header";
import { useOptionalSelectionCount } from "@/components/selection-provider";
import {
  brandHrefForRole,
  primaryNavItems,
  signOutFromForNav,
  toolNavItems,
  type NavKey,
} from "@/lib/nav";
import { roleLabel, type Role } from "@/lib/roles";

export function AppHeader({
  current,
  role,
  viewerLabel,
  shell,
  verifiedHoya,
}: {
  current?: NavKey;
  role?: Role;
  viewerLabel?: string;
  shell?: "staff" | "alum";
  verifiedHoya?: boolean;
}) {
  const resolvedRole = role ?? (shell === "alum" ? "alum" : shell === "staff" ? "owner" : undefined);
  const signedIn = Boolean(resolvedRole || viewerLabel);
  const count = useOptionalSelectionCount();
  const primary = primaryNavItems(resolvedRole);
  const tools = toolNavItems(resolvedRole).map((item) =>
    item.key === "blast" && count > 0 ? { ...item, label: `${item.label} (${count})` } : item,
  );

  return (
    <ProductHeader
      homeHref={brandHrefForRole(resolvedRole)}
      items={signedIn ? primary : []}
      toolItems={signedIn ? tools : []}
      current={current}
      roleLabel={resolvedRole ? roleLabel(resolvedRole) : undefined}
      viewerLabel={viewerLabel}
      verifiedHoya={Boolean(verifiedHoya)}
      showSignOut={signedIn}
      signOutFrom={signOutFromForNav(current, resolvedRole)}
      mobileNav={signedIn ? "tabs" : "none"}
    />
  );
}
