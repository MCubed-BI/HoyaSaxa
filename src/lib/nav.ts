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
  | "profile"
  | "reports"
  | "blast"
  | "sync"
  | "message"
  | "fundraising"
  | "find-my-alum"
  | "me";

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
    { href: "/messages", label: "Messages", key: "messages" },
    { href: "/newsflash", label: "Newsflash", key: "newsflash" },
    { href: "/fundraising", label: "Give", key: "fundraising" },
  ];

  if (canUseOwnerTools(role)) {
    items.push({ href: "/reports", label: "Reports", key: "reports" });
  }
  if (canUseBlast(role)) {
    items.push({ href: "/blast", label: "Blast", key: "blast" });
  }
  if (canUseOwnerTools(role)) {
    items.push({ href: "/sync", label: "Sync", key: "sync" });
  }
  items.push({ href: "/portal", label: "Alum view", key: "alum" });
  return items;
}

/** Concept IA: Home · Directory · Events · Giving · Messages */
export function portalNavItems(): NavItem[] {
  return [
    { href: "/home", label: "Home", key: "home" },
    { href: "/portal/directory", label: "Directory", key: "portal-directory" },
    { href: "/portal/events", label: "Events", key: "events" },
    { href: "/portal/giving", label: "Giving", key: "giving" },
    { href: "/messages", label: "Messages", key: "messages" },
  ];
}

export function portalMoreItems(role: Role): NavItem[] {
  const items: NavItem[] = [
    { href: "/feed", label: "For You", key: "feed" },
    { href: "/newsflash", label: "Newsflash", key: "newsflash" },
    { href: "/portal/profile", label: "Profile", key: "profile" },
    { href: "/find-my-alum", label: "Find My Alum", key: "find-my-alum" },
    { href: "/me", label: "My record", key: "me" },
  ];
  if (role === "owner" || role === "coach") {
    items.unshift({ href: "/", label: "Staff tools", key: "directory" });
  }
  return items;
}
