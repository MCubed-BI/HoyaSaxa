import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attendanceLeadersFromLiveFeed, eventBadgeFromAttendanceLeader } from "./badges-attendance";
import { eventBadgeFromCoder4Totals } from "./badges";
import { SEED_ADMIN_ALUMNI_ID } from "./platform-roles";
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
      label: "Top Tailgate · Platinum",
      tier: "platinum",
    });
    assert.equal(JSON.stringify(badge).includes("$"), false);
  });

  it("maps alum:<uuid> personKey leaders to Top Tailgate when alumId is null", () => {
    const alumId = "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136";
    const leaders = attendanceLeadersFromLiveFeed({
      version: ATTENDANCE_BADGE_FEED_VERSION,
      attendanceCountScope: ATTENDANCE_COUNT_SCOPE,
      rankBasis: ATTENDANCE_RANK_BASIS,
      thresholdsNote: ATTENDANCE_BADGE_THRESHOLDS_NOTE,
      rows: [],
      leaders: [
        {
          personKey: `alum:${alumId}`,
          alumId: null,
          userId: alumId,
          displayName: "Mike",
          attendanceCount: 3,
          attendanceCountScope: ATTENDANCE_COUNT_SCOPE,
          lastCheckedInAt: "2026-04-01T16:00:00.000Z",
          rank: 2,
          percentile: 90,
          cohortSize: 10,
        },
      ],
    });
    assert.deepEqual(leaders.map((row) => row.alumId), [alumId]);
    assert.deepEqual(eventBadgeFromCoder4Totals(leaders[0]), {
      type: "event_top_gold",
      label: "Top Tailgate · Gold",
      tier: "gold",
    });
  });

  it("maps displayName Mike / Hoyas-style leaders to Top Tailgate chips", () => {
    const leaders = attendanceLeadersFromLiveFeed({
      version: ATTENDANCE_BADGE_FEED_VERSION,
      attendanceCountScope: ATTENDANCE_COUNT_SCOPE,
      rankBasis: ATTENDANCE_RANK_BASIS,
      thresholdsNote: ATTENDANCE_BADGE_THRESHOLDS_NOTE,
      rows: [],
      leaders: [
        {
          personKey: "user:mike",
          alumId: null,
          userId: "Mike",
          displayName: "Mike",
          attendanceCount: 4,
          attendanceCountScope: ATTENDANCE_COUNT_SCOPE,
          lastCheckedInAt: "2026-04-01T16:00:00.000Z",
          rank: 1,
          percentile: 100,
          cohortSize: 4,
        },
      ],
    });
    assert.deepEqual(leaders.map((row) => row.alumId), [SEED_ADMIN_ALUMNI_ID]);
    assert.deepEqual(eventBadgeFromAttendanceLeader(leaders[0]!), {
      type: "event_top_platinum",
      label: "Top Tailgate · Platinum",
      tier: "platinum",
    });
    assert.equal(JSON.stringify(eventBadgeFromAttendanceLeader(leaders[0]!)).includes("$"), false);
    assert.equal(JSON.stringify(eventBadgeFromAttendanceLeader(leaders[0]!)).includes("#1"), false);
  });
});
