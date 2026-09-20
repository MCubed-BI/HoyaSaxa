import {
  ATTENDANCE_COUNT_SCOPE,
  listAttendanceLeaders,
  rankByCount,
  type AttendanceCountScope,
  type AttendanceLeaderRow,
} from "@/lib/event-attendance";
import { ensureEventTables, seedDemoEventsIfEmpty } from "@/lib/event-schema";
import { getSql } from "@/lib/db";

/**
 * Coder 3 badge feed (consume-only).
 *
 * Import this module — do not dual-write badge UI here.
 * Soft-stack: CA bc-25180ec2 stubs were not on main at implementation time.
 *
 * Each row is one alum/person × event check-in, plus rolled **lifetime**
 * attendance totals (all events, all time — not season). Rank / percentile
 * are among all attendees across all events (“Top Tailgate” style).
 *
 * Coder 3 applies the same thresholds as donor badges:
 *   Top 1% → Platinum
 *   Top 10% → Gold
 *   Top 25% → Silver
 *   Top 50% → Bronze
 */
export const ATTENDANCE_BADGE_FEED_VERSION = 1 as const;
export const ATTENDANCE_RANK_BASIS = "lifetime_all_events" as const;
export const ATTENDANCE_BADGE_THRESHOLDS_NOTE =
  "Coder 3 applies thresholds from raw rank/percentile: top 1% Platinum, 10% Gold, 25% Silver, 50% Bronze.";

export type AttendanceBadgeFeedRow = {
  eventId: string;
  eventSlug?: string;
  eventTitle?: string;
  alumId: string | null;
  userId: string;
  checkedInAt: string;
  attendanceCount: number;
  attendanceCountScope: AttendanceCountScope;
  rank: number;
  percentile: number;
  cohortSize: number;
  rankBasis: typeof ATTENDANCE_RANK_BASIS;
  eventRank?: number;
  eventPercentile?: number;
  eventCohortSize?: number;
};

export type AttendanceBadgeFeed = {
  version: typeof ATTENDANCE_BADGE_FEED_VERSION;
  attendanceCountScope: AttendanceCountScope;
  rankBasis: typeof ATTENDANCE_RANK_BASIS;
  thresholdsNote: typeof ATTENDANCE_BADGE_THRESHOLDS_NOTE;
  rows: AttendanceBadgeFeedRow[];
  leaders: AttendanceLeaderRow[];
};

export function eventSlugFromTitle(title: string, eventId: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = eventId.replace(/-/g, "").slice(0, 8);
  return slug ? `${slug}-${suffix}` : eventId;
}

function asIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

export async function listAttendanceBadgeFeed(input?: {
  eventId?: string;
  alumId?: string;
  userId?: string;
  limit?: number;
}): Promise<AttendanceBadgeFeed> {
  await ensureEventTables();
  await seedDemoEventsIfEmpty();
  const leaders = await listAttendanceLeaders(200);
  const rankByPerson = new Map(leaders.map((row) => [row.personKey, row]));

  const filters: string[] = [];
  const params: unknown[] = [];
  if (input?.eventId) {
    params.push(input.eventId);
    filters.push(`a.event_id = $${params.length}`);
  }
  if (input?.alumId) {
    params.push(input.alumId);
    filters.push(`a.alum_id = $${params.length}`);
  }
  if (input?.userId) {
    params.push(input.userId);
    filters.push(`a.user_id = $${params.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const limit = Math.min(Math.max(input?.limit ?? 500, 1), 1000);
  params.push(limit);

  const records = await query<Record<string, unknown>[]>(
    `
      SELECT
        a.event_id,
        a.person_key,
        a.alum_id,
        a.user_id,
        a.checked_in_at,
        e.title AS event_title
      FROM event_attendance a
      JOIN events e ON e.id = a.event_id
      ${where}
      ORDER BY a.checked_in_at DESC
      LIMIT $${params.length}
    `,
    params,
  );

  const eventCohorts = new Map<string, Map<string, number>>();
  for (const row of records) {
    const eventId = String(row.event_id);
    const personKey = String(row.person_key);
    if (!eventCohorts.has(eventId)) eventCohorts.set(eventId, new Map());
    const people = eventCohorts.get(eventId)!;
    people.set(personKey, (people.get(personKey) ?? 0) + 1);
  }
  const eventRanks = new Map<string, Map<string, { rank: number; percentile: number; cohortSize: number }>>();
  for (const [eventId, people] of eventCohorts) {
    const ranked = rankByCount(
      [...people.entries()].map(([personKey, attendanceCount]) => ({ personKey, attendanceCount })),
    );
    eventRanks.set(eventId, new Map(ranked.map((row) => [row.personKey, row])));
  }

  const rows: AttendanceBadgeFeedRow[] = records.map((row) => {
    const eventId = String(row.event_id);
    const personKey = String(row.person_key);
    const title = String(row.event_title ?? "");
    const lifetime = rankByPerson.get(personKey);
    const eventRank = eventRanks.get(eventId)?.get(personKey);
    return {
      eventId,
      eventSlug: eventSlugFromTitle(title, eventId),
      eventTitle: title || undefined,
      alumId: typeof row.alum_id === "string" && row.alum_id ? row.alum_id : null,
      userId: String(row.user_id ?? ""),
      checkedInAt: asIso(row.checked_in_at),
      attendanceCount: lifetime?.attendanceCount ?? 1,
      attendanceCountScope: ATTENDANCE_COUNT_SCOPE,
      rank: lifetime?.rank ?? leaders.length + 1,
      percentile: lifetime?.percentile ?? 100,
      cohortSize: lifetime?.cohortSize ?? leaders.length,
      rankBasis: ATTENDANCE_RANK_BASIS,
      eventRank: eventRank?.rank,
      eventPercentile: eventRank?.percentile,
      eventCohortSize: eventRank?.cohortSize,
    };
  });

  return {
    version: ATTENDANCE_BADGE_FEED_VERSION,
    attendanceCountScope: ATTENDANCE_COUNT_SCOPE,
    rankBasis: ATTENDANCE_RANK_BASIS,
    thresholdsNote: ATTENDANCE_BADGE_THRESHOLDS_NOTE,
    rows,
    leaders,
  };
}
