import { canUseAlumEmailBlast, canUseBlast, canUseOwnerTools, type Role } from "@/lib/roles";

export type NavKey =
  | "directory"
  | "alum"
  | "home"
  | "portal-directory"
  | "events"
  | "giving"
  | "messages"
  | "feed"
  | "newsflash"
  | "board"
  | "brothers"
  | "profile"
  | "reports"
  | "blast"
  | "sync"
  | "message"
  | "fundraising"
  | "find-my-alum"
  | "me"
  | "admin";

export type NavItem = {
  href: string;
  label: string;
  key: NavKey;
};

/** Shared product IA for Admin and Alum. Directory href is role-aware. */
export function directoryHrefForRole(role?: Role) {
  return role === "owner" || role === "coach" ? "/" : "/directory";
}

/** Brand mark — same welcome home for every signed-in role. */
export function brandHrefForRole(_role?: Role) {
  return "/home";
}

/**
 * Primary chrome: For You · Directory · Events · Giving · Messages.
 * Same five destinations for Admin and Alum.
 */
export function primaryNavItems(role?: Role): NavItem[] {
  return [
    { href: "/feed", label: "For You", key: "feed" },
    { href: directoryHrefForRole(role), label: "Directory", key: "directory" },
    { href: "/events", label: "Events", key: "events" },
    { href: "/giving", label: "Giving", key: "giving" },
    { href: "/messages", label: "Messages", key: "messages" },
  ];
}

/**
 * Operational tools in the same header, not a second coach shell.
 * Role gates stay; Portal / Admin-portal cross-links do not.
 */
export function toolNavItems(role?: Role): NavItem[] {
  if (!role) return [];

  const items: NavItem[] = [{ href: "/find-my-alum", label: "Find My Alum", key: "find-my-alum" }];

  if (canUseOwnerTools(role)) {
    items.push({ href: "/reports", label: "Reports", key: "reports" });
  }
  if (canUseBlast(role)) {
    items.push({ href: "/blast", label: "Blast", key: "blast" });
  }
  if (canUseAlumEmailBlast(role)) {
    items.push({ href: "/portal/blast", label: "Email classmates", key: "blast" });
  }
  if (canUseOwnerTools(role)) {
    items.push({ href: "/sync", label: "Data Sync", key: "sync" });
    items.push({ href: "/admin", label: "Admin", key: "admin" });
  }

  return items;
}

export function navItemsForRole(role: Role): NavItem[] {
  return [...primaryNavItems(role), ...toolNavItems(role)];
}

/** @deprecated Use primaryNavItems. Kept as the shared primary IA. */
export function portalNavItems(): NavItem[] {
  return primaryNavItems("alum");
}

/** For You now sits in the primary row. */
export function portalSecondaryItems(): NavItem[] {
  return [];
}

export function alumPrimaryNavItems(): NavItem[] {
  return primaryNavItems("alum");
}

/** Verified Hoya alum chrome — keep Update Me on the identity row, not buried. */
export function headerShowsUpdateMe(verifiedHoya: boolean, current?: NavKey) {
  return Boolean(verifiedHoya) && current !== "me";
}

/** Overflow / footer extras. No Portal vs Admin cross-links. */
export function portalMoreItems(role: Role): NavItem[] {
  return [...toolNavItems(role), { href: "/me", label: "My record", key: "me" }];
}

export function navKeyMatches(current: NavKey | undefined, key: NavKey) {
  if (!current) return false;
  if (current === key) return true;
  const directoryKeys: NavKey[] = ["directory", "portal-directory", "profile"];
  if (directoryKeys.includes(current) && directoryKeys.includes(key)) return true;
  if (current === "fundraising" && key === "giving") return true;
  return false;
}

export function signOutFromForNav(current?: NavKey, role?: Role) {
  if (current === "blast") return role === "alum" || role === "board" ? "/portal/blast" : "/blast";
  if (current === "newsflash" || current === "board") return "/board";
  if (current === "feed") return "/feed";
  if (current === "home") return "/home";
  if (current === "directory" || current === "portal-directory" || current === "profile") {
    return directoryHrefForRole(role);
  }
  if (current === "events") return "/events";
  if (current === "giving" || current === "fundraising") return "/giving";
  if (current === "messages" || current === "message") return "/messages";
  if (current === "admin") return "/admin";
  if (current === "reports") return "/reports";
  if (current === "sync") return "/sync";
  if (current === "find-my-alum") return "/find-my-alum";
  if (current === "me") return "/me";
  return "/home";
}
