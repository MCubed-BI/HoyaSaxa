/**
 * Coder 4 attendance feed — consume-only types.
 *
 * Coder 4 owns check-in persistence + ranks. This module never INSERTs
 * `event_checkins`. Map their rank/percentile to event badge bands only.
 *
 * Expected feed row (PR #15):
 *   eventId, eventSlug?, eventTitle?,
 *   alumId / userId, checkedInAt,
 *   attendanceCount + rank / percentile (+ cohortSize)
 *
 * Bands (same as donor): Top 1% Platinum, 10% Gold, 25% Silver, 50% Bronze
 *   ≥99 platinum · ≥90 gold · ≥75 silver · ≥50 bronze
 */
export const EVENT_BADGE_FEED_VERSION = 1 as const;

export type EventBadgeFeedRow = {
  eventId: string;
  eventSlug?: string;
  eventTitle?: string;
  alumId: string | null;
  userId?: string;
  checkedInAt: string;
  attendanceCount?: number;
  rank?: number | null;
  percentile?: number | null;
  cohortSize?: number;
};

/** Lifetime totals / rank for one alum. Coder 4 computes these. */
export type EventBadgeTotals = {
  alumId: string;
  userId?: string;
  attendanceCount: number;
  rank: number | null;
  percentile: number | null;
  cohortSize?: number;
};

/** Alias matching Coder 4 `EventCheckinFeedRow`. */
export type EventCheckinFeedRow = EventBadgeFeedRow;

export type EventBadgeFeed = {
  version?: typeof EVENT_BADGE_FEED_VERSION;
  rows?: EventBadgeFeedRow[];
  leaders?: EventBadgeTotals[];
};

function alumKey(row: { alumId?: string | null }) {
  return typeof row.alumId === "string" && row.alumId.trim() ? row.alumId : "";
}

/** Flatten Coder 4 `{ leaders, rows }` into one totals row per alumId. */
export function attendanceLeadersFromCoder4Feed(feed: EventBadgeFeed | null | undefined): EventBadgeTotals[] {
  if (!feed) return [];
  if (feed.leaders?.length) {
    return feed.leaders.filter((row) => alumKey(row));
  }
  const byAlum = new Map<string, EventBadgeTotals>();
  for (const row of feed.rows ?? []) {
    const alumId = alumKey(row);
    if (!alumId || byAlum.has(alumId)) continue;
    byAlum.set(alumId, {
      alumId,
      userId: row.userId,
      attendanceCount: row.attendanceCount ?? 0,
      rank: row.rank ?? null,
      percentile: row.percentile ?? null,
      cohortSize: row.cohortSize,
    });
  }
  return [...byAlum.values()];
}
