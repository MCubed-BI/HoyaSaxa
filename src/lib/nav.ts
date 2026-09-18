import { canUseBlast, canUseOwnerTools, type Role } from "@/lib/roles";

export type NavKey =
  | "directory"
  | "alum"
  | "reports"
  | "blast"
  | "sync"
  | "message"
  | "newsflash"
  | "fundraising"
  | "find-my-alum"
  | "me";

export type NavItem = {
  href: string;
  label: string;
  key: NavKey;
};

export function navItemsForRole(role: Role): NavItem[] {
  const items: NavItem[] = [];

  if (role === "alum") {
    items.push({ href: "/alum", label: "Home", key: "alum" });
  } else {
    items.push({ href: "/", label: "Directory", key: "directory" });
  }

  items.push({ href: "/find-my-alum", label: "Find My Alum", key: "find-my-alum" });
  items.push({ href: "/message", label: "Coach note", key: "message" });
  items.push({ href: "/newsflash", label: "Newsflash", key: "newsflash" });
  items.push({ href: "/fundraising", label: "Give", key: "fundraising" });

  if (canUseOwnerTools(role)) {
    items.push({ href: "/reports", label: "Reports", key: "reports" });
  }
  if (canUseBlast(role)) {
    items.push({ href: "/blast", label: "Blast", key: "blast" });
  }
  if (canUseOwnerTools(role)) {
    items.push({ href: "/sync", label: "Sync", key: "sync" });
  }
  if (role !== "alum") {
    items.push({ href: "/alum", label: "Alum view", key: "alum" });
  } else {
    items.push({ href: "/me", label: "My record", key: "me" });
  }

  return items;
}
