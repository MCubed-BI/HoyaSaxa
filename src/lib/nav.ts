import { canUseBlast, canUseOwnerTools, type Role } from "@/lib/roles";

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

export function navItemsForRole(role: Role): NavItem[] {
  if (role === "alum" || role === "board") {
    return portalNavItems();
  }

  const items: NavItem[] = [
    { href: "/", label: "Directory", key: "directory" },
    { href: "/find-my-alum", label: "Find My Alum", key: "find-my-alum" },
    { href: "/events", label: "Events", key: "events" },
    { href: "/messages", label: "Messages", key: "messages" },
    { href: "/board", label: "Board", key: "board" },
    { href: "/giving", label: "Give", key: "giving" },
  ];

  if (canUseOwnerTools(role)) {
    items.push({ href: "/reports", label: "Reports", key: "reports" });
  }
  if (canUseBlast(role)) {
    items.push({ href: "/blast", label: "Blast", key: "blast" });
  }
  if (canUseOwnerTools(role)) {
    items.push({ href: "/sync", label: "Sync", key: "sync" });
    items.push({ href: "/admin", label: "Admin", key: "admin" });
  }
  items.push({ href: "/portal", label: "Alum view", key: "alum" });
  return items;
}

/** Concept IA: Home · Directory · Events · Giving · Messages */
export function portalNavItems(): NavItem[] {
  return [
    { href: "/home", label: "Home", key: "home" },
    { href: "/directory", label: "Directory", key: "portal-directory" },
    { href: "/events", label: "Events", key: "events" },
    { href: "/giving", label: "Giving", key: "giving" },
    { href: "/messages", label: "Messages", key: "messages" },
  ];
}

/** Desktop extras that sit next to the primary portal tabs on locker chrome. */
export function portalSecondaryItems(): NavItem[] {
  return [{ href: "/feed", label: "For You", key: "feed" }];
}

export function alumPrimaryNavItems(): NavItem[] {
  return [...portalNavItems(), ...portalSecondaryItems()];
}

/** Verified Hoya alum chrome — keep Update Me on the identity row, not buried. */
export function headerShowsUpdateMe(verifiedHoya: boolean, current?: NavKey) {
  return Boolean(verifiedHoya) && current !== "me";
}

export function portalMoreItems(role: Role): NavItem[] {
  const items: NavItem[] = [
    { href: "/feed", label: "For You", key: "feed" },
    { href: "/directory", label: "Profile", key: "profile" },
    { href: "/find-my-alum", label: "Find My Alum", key: "find-my-alum" },
    { href: "/me", label: "My record", key: "me" },
  ];
  if (role === "alum" || role === "board") {
    items.push({ href: "/portal/blast", label: "Email classmates", key: "blast" });
  }
  if (role === "owner" || role === "coach") {
    items.unshift({ href: "/", label: "Admin portal", key: "directory" });
    items.push({ href: "/admin", label: "Board grants", key: "admin" });
  }
  return items;
}
