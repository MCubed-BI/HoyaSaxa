/**
 * Server-only: consume Coder 4's live attendance feed for event / Top Tailgate bands.
 *
 * Same payload as `GET /api/events/attendance/feed` and `?alumId=`.
 * Never writes `event_checkins`. Do not import this file from client components.
 */
import { isPreviewAlumSession, readAlumSessionFromCookies } from "@/lib/alum-session";
import { attendanceLeadersFromCoder4Feed, normalizeAlumniId, type EventBadgeTotals } from "@/lib/badge-event-feed";
import {
  loadAlumniNameIndex,
  resolveAttendanceAlumId,
  type AlumniIdentity,
} from "@/lib/badge-identity";
import { eventBadgeFromCoder4Totals, listPublicBadges, listPublicBadgesMany } from "@/lib/badges";
import {
  alumAttendanceTotalsFromFeed,
  listEventCheckinFeed,
  type AttendanceBadgeFeed,
} from "@/lib/event-attendance-feed";

export function attendanceLeadersFromLiveFeed(
  feed: AttendanceBadgeFeed,
  alumni: AlumniIdentity[] = [],
): EventBadgeTotals[] {
  const fromLeaders = attendanceLeadersFromCoder4Feed({
    leaders: feed.leaders.map((row) => ({
      alumId: resolveAttendanceAlumId(row, alumni) || row.alumId || "",
      userId: row.userId,
      personKey: row.personKey,
      displayName: row.displayName,
      attendanceCount: row.attendanceCount,
      rank: row.rank,
      percentile: row.percentile,
      cohortSize: row.cohortSize,
    })),
  });
  const resolved = fromLeaders.length
    ? fromLeaders
    : attendanceLeadersFromCoder4Feed({
        rows: feed.rows.map((row) => ({
          ...row,
          alumId: resolveAttendanceAlumId(
            { ...row, personKey: row.userId.startsWith("alum:") ? row.userId : undefined },
            alumni,
          ),
          personKey: row.userId.startsWith("alum:") ? row.userId : undefined,
        })),
      });
  const byAlum = new Map<string, EventBadgeTotals>();
  for (const row of resolved) {
    const alumId = resolveAttendanceAlumId(row, alumni) || normalizeAlumniId(row.alumId);
    if (!alumId) continue;
    if (!byAlum.has(alumId)) byAlum.set(alumId, { ...row, alumId });
  }
  return [...byAlum.values()];
}

export function eventBadgeFromAttendanceLeader(row: {
  alumId?: string | null;
  userId?: string;
  personKey?: string;
  attendanceCount: number;
  rank: number | null;
  percentile: number | null;
  cohortSize?: number;
}) {
  return eventBadgeFromCoder4Totals({
    alumId: row.alumId || row.personKey || row.userId || "attendance",
    userId: row.userId,
    personKey: row.personKey,
    attendanceCount: row.attendanceCount,
    rank: row.rank,
    percentile: row.percentile,
    cohortSize: row.cohortSize,
  });
}

/** Claimed / contract `hoya_alum_session` — preview locker Alum is not Verified Hoya. */
export async function sessionVerifiedAlumniIds() {
  const session = await readAlumSessionFromCookies();
  if (!session || isPreviewAlumSession(session) || !session.alumniId.trim()) return [];
  return [session.alumniId];
}

/** Same JSON as `GET /api/events/attendance/feed` (+ optional `?alumId=`). */
export async function loadAttendanceFeedForBadges(alumId?: string) {
  const feed = await listEventCheckinFeed(alumId ? { alumId } : { limit: 1000 });
  if (alumId) {
    return { alum: alumAttendanceTotalsFromFeed(alumId, feed), feed };
  }
  return feed;
}

export async function listPublicBadgesFromFeed(alumniId: string) {
  try {
    const feed = await listEventCheckinFeed({ limit: 1000 });
    const alumni = await loadAlumniNameIndex().catch(() => [] as AlumniIdentity[]);
    const wanted = normalizeAlumniId(alumniId);
    const totals =
      attendanceLeadersFromLiveFeed(feed, alumni).find((row) => normalizeAlumniId(row.alumId) === wanted) ??
      alumAttendanceTotalsFromFeed(alumniId, feed);
    return listPublicBadges(alumniId, { attendanceTotals: totals });
  } catch {
    return listPublicBadges(alumniId);
  }
}

export async function listPublicBadgesManyFromFeed(
  alumniIds: string[],
  options: { verifiedAlumniIds?: string[] } = {},
) {
  const verifiedAlumniIds = [
    ...new Set([...(options.verifiedAlumniIds ?? []), ...(await sessionVerifiedAlumniIds().catch(() => []))]),
  ];
  try {
    const [feed, alumni] = await Promise.all([
      listEventCheckinFeed({ limit: 1000 }),
      loadAlumniNameIndex().catch(() => [] as AlumniIdentity[]),
    ]);
    return listPublicBadgesMany(alumniIds, {
      verifiedAlumniIds,
      attendanceLeaders: attendanceLeadersFromLiveFeed(feed, alumni),
    });
  } catch {
    return listPublicBadgesMany(alumniIds, { verifiedAlumniIds });
  }
}
