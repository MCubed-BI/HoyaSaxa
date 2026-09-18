import type { EventCategory, EventRole } from "@/lib/event-auth";

export type EventTab = "upcoming" | "past" | "mine";

export type EventListItem = {
  id: string;
  title: string;
  category: EventCategory;
  starts_at: string;
  location: string | null;
  thumbnail_url: string | null;
  description: string | null;
  created_by: string;
  created_by_role: EventRole;
  created_by_me: boolean;
  rsvped: boolean;
};

export type EventListResult = {
  tab: EventTab;
  rows: EventListItem[];
  upcomingCount: number;
  pastCount: number;
  mineCount: number;
};

export function parseEventTab(value: string | string[] | undefined): EventTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "past" || raw === "mine") return raw;
  return "upcoming";
}
