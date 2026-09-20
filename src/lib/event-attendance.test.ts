import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAlumSessionToken } from "./alum-session";
import { createSessionToken } from "./auth";
import { eventActorFromTokens } from "./event-actor";
import {
  ATTENDANCE_COUNT_SCOPE,
  attendancePersonFromActor,
  attendancePersonFromStaffInput,
  isEventRecordId,
  percentileFromRank,
  rankByCount,
  resolveCheckInAction,
} from "./event-attendance";
import { canCreateEvents, canOverrideEventCheckIn } from "./event-auth";
import { eventSlugFromTitle, type AlumAttendanceTotals, type EventCheckinFeedRow } from "./event-attendance-feed";
import { createHoyaAlumSessionToken } from "./hoya-alum-session";
import { isAlumAllowedPath, isDataSyncPath } from "./portal-paths";
import { isAlumAllowedPath as messagesAlumAllowed, isDataSyncPath as messagesDataSync } from "./messages-auth";

describe("event attendance identity", () => {
  it("keys claimed alum by alumniId and locker/staff by user label", () => {
    assert.deepEqual(
      attendancePersonFromActor({
        username: "Pat Hoya",
        role: "alum",
        alumId: "11111111-1111-1111-1111-111111111111",
        userId: "11111111-1111-1111-1111-111111111111",
      }),
      {
        personKey: "alum:11111111-1111-1111-1111-111111111111",
        alumId: "11111111-1111-1111-1111-111111111111",
        userId: "11111111-1111-1111-1111-111111111111",
        displayName: "Pat Hoya",
      },
    );
    assert.deepEqual(attendancePersonFromActor({ username: "Alum", role: "alum", userId: "Alum" }), {
      personKey: "user:alum",
      alumId: null,
      userId: "Alum",
      displayName: "Alum",
    });
  });

  it("lets staff target another person without inventing Register myself", () => {
    assert.deepEqual(attendancePersonFromStaffInput({ userId: "Lars", displayName: "Lars" }), {
      personKey: "user:lars",
      alumId: null,
      userId: "Lars",
      displayName: "Lars",
    });
    assert.equal(attendancePersonFromStaffInput({}), null);
  });
});

describe("event check-in rules", () => {
  it("is idempotent per event/person unless staff override", () => {
    assert.equal(resolveCheckInAction({ existing: false, override: false, canOverride: false }), "insert");
    assert.equal(resolveCheckInAction({ existing: true, override: false, canOverride: false }), "noop");
    assert.equal(resolveCheckInAction({ existing: true, override: true, canOverride: false }), "forbidden-override");
    assert.equal(resolveCheckInAction({ existing: true, override: true, canOverride: true }), "override");
    assert.equal(canOverrideEventCheckIn("coach"), true);
    assert.equal(canOverrideEventCheckIn("board"), true);
    assert.equal(canOverrideEventCheckIn("alum"), false);
    assert.equal(canCreateEvents("alum"), true);
  });

  it("ranks lifetime counts with ties sharing the min rank", () => {
    const ranked = rankByCount([
      { name: "A", attendanceCount: 4 },
      { name: "B", attendanceCount: 4 },
      { name: "C", attendanceCount: 2 },
      { name: "D", attendanceCount: 1 },
    ]);
    assert.equal(ATTENDANCE_COUNT_SCOPE, "lifetime");
    assert.equal(ranked[0]?.rank, 1);
    assert.equal(ranked[1]?.rank, 1);
    assert.equal(ranked[2]?.rank, 3);
    assert.equal(ranked[3]?.rank, 4);
    assert.equal(ranked[0]?.percentile, 100);
    assert.equal(ranked[2]?.percentile, 50);
    assert.equal(percentileFromRank(1, 100), 100);
    assert.equal(percentileFromRank(2, 100), 99);
    assert.equal(eventSlugFromTitle("Homecoming Tailgate", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"), "homecoming-tailgate-aaaaaaaa");
  });

  it("exports a Coder 3 consume shape without badge UI fields", () => {
    const row: EventCheckinFeedRow = {
      eventId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      eventSlug: "homecoming-tailgate-aaaaaaaa",
      eventTitle: "Homecoming Tailgate",
      alumId: "11111111-1111-1111-1111-111111111111",
      userId: "11111111-1111-1111-1111-111111111111",
      checkedInAt: "2026-09-20T21:00:00.000Z",
      attendanceCount: 3,
      attendanceCountScope: "lifetime",
      rank: 1,
      percentile: 100,
      cohortSize: 4,
      rankBasis: "lifetime_all_events",
    };
    const alum: AlumAttendanceTotals = {
      alumId: row.alumId!,
      userId: row.userId,
      attendanceCount: row.attendanceCount,
      attendanceCountScope: "lifetime",
      rank: row.rank,
      percentile: row.percentile,
      cohortSize: row.cohortSize,
      rankBasis: "lifetime_all_events",
      events: [{ eventId: row.eventId, eventSlug: row.eventSlug, eventTitle: row.eventTitle, checkedInAt: row.checkedInAt }],
    };
    assert.equal(row.attendanceCountScope, "lifetime");
    assert.equal(alum.events.length, 1);
    assert.equal(JSON.stringify(row).includes("Platinum"), false);
    assert.equal(JSON.stringify(alum).includes("badge"), false);
  });
});

describe("event actor sessions", () => {
  it("prefers ga_session staff, then contract alum, then locker preview", () => {
    const staff = eventActorFromTokens({
      staffToken: createSessionToken("Hoyas"),
      alumToken: createHoyaAlumSessionToken("alum", "Alum"),
    });
    assert.equal(staff?.role, "coach");
    assert.equal(staff?.username, "Hoyas");

    const claimed = eventActorFromTokens({
      alumToken: createAlumSessionToken({
        role: "alum",
        alumniId: "33333333-3333-3333-3333-333333333333",
        email: "pat@example.com",
        name: "Pat Hoya",
      }),
    });
    assert.equal(claimed?.role, "alum");
    assert.equal(claimed?.alumId, "33333333-3333-3333-3333-333333333333");
    assert.equal(claimed?.userId, "33333333-3333-3333-3333-333333333333");

    const locker = eventActorFromTokens({
      alumToken: createHoyaAlumSessionToken("alum", "Alum"),
    });
    assert.equal(locker?.role, "alum");
    assert.equal(locker?.username, "Alum");
    assert.equal(locker?.alumId, null);
  });
});

describe("event attendance gates", () => {
  it("allows alum check-in paths and keeps Data Sync staff-only", () => {
    assert.equal(isAlumAllowedPath("/events"), true);
    assert.equal(isAlumAllowedPath("/events/check-in"), true);
    assert.equal(isAlumAllowedPath("/events/attendance"), true);
    assert.equal(isAlumAllowedPath("/api/events/attendance/feed"), true);
    assert.equal(isAlumAllowedPath("/sync"), false);
    assert.equal(isAlumAllowedPath("/api/data-sync"), false);
    assert.equal(isDataSyncPath("/sync"), true);
    assert.equal(isDataSyncPath("/api/data-sync"), true);
    assert.equal(messagesAlumAllowed("/sync"), false);
    assert.equal(messagesDataSync("/api/data-sync/abc/apply"), true);
    assert.equal(isEventRecordId("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"), true);
    assert.equal(isEventRecordId("not-an-id"), false);
  });
});
