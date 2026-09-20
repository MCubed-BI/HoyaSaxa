import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attendanceLeadersFromLiveFeed } from "./badges-attendance";
import { eventBadgeFromCoder4Totals } from "./badges";
import {
  ATTENDANCE_BADGE_FEED_VERSION,
  ATTENDANCE_BADGE_THRESHOLDS_NOTE,
  ATTENDANCE_RANK_BASIS,
} from "./event-attendance-feed";
import { ATTENDANCE_COUNT_SCOPE } from "./event-attendance";

describe("live attendance feed consume", () => {
  it("maps GET /api/events/attendance/feed leaders to event bands without $", () => {
    const leaders = attendanceLeadersFromLiveFeed({
      version: ATTENDANCE_BADGE_FEED_VERSION,
      attendanceCountScope: ATTENDANCE_COUNT_SCOPE,
      rankBasis: ATTENDANCE_RANK_BASIS,
      thresholdsNote: ATTENDANCE_BADGE_THRESHOLDS_NOTE,
      rows: [
        {
          eventId: "e1",
          eventSlug: "homecoming-tailgate",
          eventTitle: "Homecoming Tailgate",
          alumId: "a",
          userId: "a",
          checkedInAt: "2026-04-01T16:00:00.000Z",
          attendanceCount: 8,
          attendanceCountScope: ATTENDANCE_COUNT_SCOPE,
          rank: 1,
          percentile: 100,
          cohortSize: 20,
          rankBasis: ATTENDANCE_RANK_BASIS,
        },
      ],
      leaders: [
        {
          personKey: "alum:a",
          alumId: "a",
          userId: "a",
          displayName: "Alum A",
          attendanceCount: 8,
          attendanceCountScope: ATTENDANCE_COUNT_SCOPE,
          lastCheckedInAt: "2026-04-01T16:00:00.000Z",
          rank: 1,
          percentile: 100,
          cohortSize: 20,
        },
        {
          personKey: "user:guest",
          alumId: null,
          userId: "guest",
          displayName: "Guest",
          attendanceCount: 1,
          attendanceCountScope: ATTENDANCE_COUNT_SCOPE,
          lastCheckedInAt: "2026-04-01T16:00:00.000Z",
          rank: 2,
          percentile: 95,
          cohortSize: 20,
        },
      ],
    });
    assert.deepEqual(
      leaders.map((row) => row.alumId),
      ["a"],
    );
    const badge = eventBadgeFromCoder4Totals(leaders[0]);
    assert.deepEqual(badge, {
      type: "event_top_platinum",
      label: "Event top · Platinum",
      tier: "platinum",
    });
    assert.equal(JSON.stringify(badge).includes("$"), false);
  });
});
