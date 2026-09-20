/**
 * Soft-consume Coder 4's Ready feed (PR #15). Never writes event_checkins.
 *
 * When `src/lib/event-attendance-feed.ts` is on the tree (after #15 merges),
 * we call `listEventCheckinFeed` / `getAlumAttendanceTotals` and map ranks
 * to event badge bands. Until then this module returns `undefined` and
 * loaders keep the SELECT-only fallback.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  attendanceLeadersFromCoder4Feed,
  type EventBadgeFeed,
  type EventBadgeTotals,
} from "@/lib/badge-event-feed";

type Coder4FeedModule = {
  listEventCheckinFeed?: (input?: { alumId?: string; limit?: number }) => Promise<EventBadgeFeed>;
  getAlumAttendanceTotals?: (alumId: string) => Promise<EventBadgeTotals>;
};

function coder4FeedFileExists() {
  return existsSync(join(process.cwd(), "src/lib/event-attendance-feed.ts"));
}

async function importCoder4FeedModule(): Promise<Coder4FeedModule | null> {
  if (!coder4FeedFileExists()) return null;
  try {
    // Hide the specifier from the bundler — the file is not on this branch yet.
    const load = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<Coder4FeedModule>;
    return await load("@/lib/event-attendance-feed");
  } catch {
    return null;
  }
}

/** `undefined` = feed not on tree; otherwise Coder 4 totals (possibly empty). */
export async function tryCoder4AlumAttendanceTotals(
  alumId: string,
): Promise<EventBadgeTotals | null | undefined> {
  if (!alumId.trim()) return undefined;
  const mod = await importCoder4FeedModule();
  if (!mod?.getAlumAttendanceTotals) return undefined;
  try {
    return await mod.getAlumAttendanceTotals(alumId);
  } catch {
    return undefined;
  }
}

/** `undefined` = feed not on tree; otherwise lifetime leaders keyed by alumId. */
export async function tryCoder4AttendanceLeaders(): Promise<EventBadgeTotals[] | undefined> {
  const mod = await importCoder4FeedModule();
  if (!mod?.listEventCheckinFeed) return undefined;
  try {
    const feed = await mod.listEventCheckinFeed({ limit: 1000 });
    return attendanceLeadersFromCoder4Feed(feed);
  } catch {
    return undefined;
  }
}

export function coder4AttendanceFeedAvailable() {
  return coder4FeedFileExists();
}
