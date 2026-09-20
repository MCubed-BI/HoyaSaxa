/**
 * Server-only: consume Coder 4's live attendance feed for event / Top Tailgate bands.
 *
 * Same payload as `GET /api/events/attendance/feed` and `?alumId=`.
 * Never writes `event_checkins`. Do not import this file from client components.
 */
import { attendanceLeadersFromCoder4Feed, type EventBadgeTotals } from "@/lib/badge-event-feed";
import { listPublicBadges, listPublicBadgesMany } from "@/lib/badges";
import {
  alumAttendanceTotalsFromFeed,
  getAlumAttendanceTotals,
  listEventCheckinFeed,
  type AttendanceBadgeFeed,
} from "@/lib/event-attendance-feed";

export function attendanceLeadersFromLiveFeed(feed: AttendanceBadgeFeed): EventBadgeTotals[] {
  const fromLeaders = attendanceLeadersFromCoder4Feed({
    leaders: feed.leaders.map((row) => ({
      alumId: row.alumId ?? "",
      userId: row.userId,
      attendanceCount: row.attendanceCount,
      rank: row.rank,
      percentile: row.percentile,
      cohortSize: row.cohortSize,
    })),
  });
  return fromLeaders.length ? fromLeaders : attendanceLeadersFromCoder4Feed({ rows: feed.rows });
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
    const totals = await getAlumAttendanceTotals(alumniId);
    return listPublicBadges(alumniId, { attendanceTotals: totals });
  } catch {
    return listPublicBadges(alumniId);
  }
}

export async function listPublicBadgesManyFromFeed(
  alumniIds: string[],
  options: { verifiedAlumniIds?: string[] } = {},
) {
  try {
    const feed = await listEventCheckinFeed({ limit: 1000 });
    return listPublicBadgesMany(alumniIds, {
      verifiedAlumniIds: options.verifiedAlumniIds,
      attendanceLeaders: attendanceLeadersFromLiveFeed(feed),
    });
  } catch {
    return listPublicBadgesMany(alumniIds, options);
  }
}
