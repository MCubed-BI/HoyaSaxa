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

/** Coder 4 Ready row — `GET /api/events/attendance/feed`. */
export type EventBadgeFeedRow = {
  eventId: string;
  eventSlug?: string;
  eventTitle?: string;
  alumId: string | null;
  userId: string;
  checkedInAt: string;
  attendanceCount: number;
  rank: number;
  percentile: number;
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
  version?: typeof EVENT_BADGE_FEED_VERSION | number;
  attendanceCountScope?: string;
  rankBasis?: string;
  rows?: EventBadgeFeedRow[];
  leaders?: Array<EventBadgeTotals & { alumId?: string | null }>;
};

/** `GET /api/events/attendance/feed` or `?alumId=` → `{ alum, feed }`. */
export type Coder4AttendanceFeedResponse =
  | EventBadgeFeed
  | {
      alum?: EventBadgeTotals | null;
      feed?: EventBadgeFeed | null;
    };

function alumKey(row: { alumId?: string | null }) {
  return typeof row.alumId === "string" && row.alumId.trim() ? row.alumId : "";
}

function asTotals(row: {
  alumId?: string | null;
  userId?: string;
  attendanceCount?: number;
  rank?: number | null;
  percentile?: number | null;
  cohortSize?: number;
}): EventBadgeTotals | null {
  const alumId = alumKey(row);
  if (!alumId) return null;
  return {
    alumId,
    userId: row.userId,
    attendanceCount: row.attendanceCount ?? 0,
    rank: row.rank ?? null,
    percentile: row.percentile ?? null,
    cohortSize: row.cohortSize,
  };
}

/** Accept Coder 4's list payload or `{ alum, feed }` from the GET route. */
export function eventBadgeFeedFromCoder4Json(payload: Coder4AttendanceFeedResponse | null | undefined): EventBadgeFeed | null {
  if (!payload || typeof payload !== "object") return null;
  if ("feed" in payload && payload.feed) {
    const leaders = payload.feed.leaders?.length
      ? payload.feed.leaders
      : payload.alum
        ? [payload.alum]
        : [];
    return { ...payload.feed, leaders };
  }
  if ("rows" in payload || "leaders" in payload) return payload;
  if ("alum" in payload && payload.alum) {
    return { rows: [], leaders: [payload.alum] };
  }
  return null;
}

/** Flatten Coder 4 `{ leaders, rows }` into one totals row per alumId. */
export function attendanceLeadersFromCoder4Feed(
  feed: EventBadgeFeed | Coder4AttendanceFeedResponse | null | undefined,
): EventBadgeTotals[] {
  const normalized = eventBadgeFeedFromCoder4Json(feed) ?? (feed && "rows" in (feed as object) ? (feed as EventBadgeFeed) : null);
  if (!normalized) return [];
  if (normalized.leaders?.length) {
    return normalized.leaders.flatMap((row) => {
      const totals = asTotals(row);
      return totals ? [totals] : [];
    });
  }
  const byAlum = new Map<string, EventBadgeTotals>();
  for (const row of normalized.rows ?? []) {
    const totals = asTotals(row);
    if (!totals || byAlum.has(totals.alumId)) continue;
    byAlum.set(totals.alumId, totals);
  }
  return [...byAlum.values()];
}
