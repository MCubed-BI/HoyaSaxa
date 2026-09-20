import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PREVIEW_ALUMNI_ID } from "./alum-session";
import { SEED_ADMIN_ALUMNI_ID } from "./platform-roles";
import {
  attendanceLeadersFromCoder4Feed,
  eventBadgeFeedFromCoder4Json,
  resolveFeedAlumId,
} from "./badge-event-feed";
import {
  BADGE_PERCENTILE_THRESHOLDS,
  BADGE_TYPES,
  assemblePublicBadges,
  computeEventTopBadge,
  donorTierForAlumniId,
  eventBadgeFromCoder4Row,
  eventBadgeFromCoder4Totals,
  eventSlugFromTitle,
  eventTierForAlumniId,
  eventTierFromCoder4Feed,
  grantVerifiedHoyaForAlumSession,
  percentileFromRank,
  publicBadgesJson,
  tierFromPercentile,
  toPublicBadge,
} from "./badges";

describe("badge primitives", () => {
  it("uses the same percentile cutoffs for donor and event tiers", () => {
    assert.deepEqual(BADGE_PERCENTILE_THRESHOLDS, { platinum: 99, gold: 90, silver: 75, bronze: 50 });
    assert.ok(BADGE_TYPES.includes("verified_hoya"));
    assert.ok(BADGE_TYPES.includes("donor_platinum"));
    assert.ok(BADGE_TYPES.includes("event_top_bronze"));
    assert.equal(tierFromPercentile(99), "platinum");
    assert.equal(tierFromPercentile(90), "gold");
    assert.equal(tierFromPercentile(75), "silver");
    assert.equal(tierFromPercentile(50), "bronze");
    assert.equal(tierFromPercentile(49.9), null);
    assert.equal(percentileFromRank(1, 100), 100);
    assert.equal(percentileFromRank(2, 100), 99);
  });

  it("computes donor/event tiers without leaking dollar amounts", () => {
    const totals = [
      { key: "a", total_cents: 500_000 },
      { key: "b", total_cents: 1_000 },
    ];
    assert.equal(donorTierForAlumniId("a", totals), "platinum");
    assert.equal(donorTierForAlumniId("A", totals), "platinum");
    assert.equal(donorTierForAlumniId(SEED_ADMIN_ALUMNI_ID, [
      { key: SEED_ADMIN_ALUMNI_ID, total_cents: 25_000 },
    ]), "platinum");
    assert.equal(donorTierForAlumniId("missing", totals), null);
    assert.equal(eventTierForAlumniId("a", [{ key: "a", checkins: 8 }, { key: "b", checkins: 1 }]), "platinum");
    const json = publicBadgesJson([toPublicBadge("donor_gold")]);
    assert.deepEqual(json, [{ type: "donor_gold", label: "Donor · Gold", tier: "gold" }]);
    assert.equal(JSON.stringify(json).includes("cent"), false);
    assert.equal(JSON.stringify(json).includes("$"), false);
  });

  it("skips grantVerifiedHoya for preview Alum (session-only badge)", async () => {
    assert.equal(await grantVerifiedHoyaForAlumSession(null), null);
    assert.equal(await grantVerifiedHoyaForAlumSession(""), null);
    assert.equal(await grantVerifiedHoyaForAlumSession(PREVIEW_ALUMNI_ID), null);
  });

  it("assembles verified + donor + event chips without gift totals", () => {
    const badges = assemblePublicBadges({
      verified: true,
      donorTier: "platinum",
      eventTier: "gold",
    });
    assert.deepEqual(
      badges.map((badge) => badge.label),
      ["Verified Hoya", "Donor · Platinum", "Top Tailgate · Gold"],
    );
    assert.equal(JSON.stringify(badges).includes("$"), false);
    assert.equal(JSON.stringify(badges).includes("cent"), false);
  });

  it("maps Coder 4 rank/percentile to event bands and never re-ranks counts", () => {
    assert.equal(eventTierFromCoder4Feed({ percentile: 99 }), "platinum");
    assert.equal(eventTierFromCoder4Feed({ percentile: 90 }), "gold");
    assert.equal(eventTierFromCoder4Feed({ percentile: 75 }), "silver");
    assert.equal(eventTierFromCoder4Feed({ percentile: 50 }), "bronze");
    assert.equal(eventTierFromCoder4Feed({ percentile: 49 }), null);
    assert.equal(eventTierFromCoder4Feed({ rank: 1, cohortSize: 100 }), "platinum");
    assert.equal(eventTierFromCoder4Feed({ rank: 11, cohortSize: 100 }), "gold");
    assert.equal(eventTierFromCoder4Feed({ rank: 1 }), "platinum");
    assert.equal(eventTierFromCoder4Feed({ rank: 2 }), "bronze");
    assert.equal(eventTierFromCoder4Feed({ percentile: 0.99 }), "platinum");
    assert.equal(eventTierFromCoder4Feed({}), null);

    const totals = {
      alumId: "a",
      userId: "a",
      attendanceCount: 8,
      rank: 1,
      percentile: 100,
      cohortSize: 80,
    };
    assert.deepEqual(eventBadgeFromCoder4Totals(totals), {
      type: "event_top_platinum",
      label: "Top Tailgate · Platinum",
      tier: "platinum",
    });
    assert.deepEqual(
      eventBadgeFromCoder4Row({
        eventId: "evt-1",
        eventSlug: "spring-game",
        eventTitle: "Spring Game",
        alumId: "a",
        userId: "a",
        checkedInAt: "2026-04-01T16:00:00.000Z",
        attendanceCount: 3,
        rank: 11,
        percentile: 90,
        cohortSize: 100,
      }),
      { type: "event_top_gold", label: "Top Tailgate · Gold", tier: "gold" },
    );
    assert.equal(eventBadgeFromCoder4Totals(null), null);
    assert.equal(JSON.stringify(eventBadgeFromCoder4Totals(totals)).includes("$"), false);
  });

  it("prefers Coder 4 totals over local event_checkins fallback", async () => {
    const badge = await computeEventTopBadge("a", {
      totals: { alumId: "a", attendanceCount: 1, rank: 3, percentile: 75, cohortSize: 12 },
    });
    assert.deepEqual(badge, { type: "event_top_silver", label: "Top Tailgate · Silver", tier: "silver" });
    const none = await computeEventTopBadge("a", { totals: null });
    assert.equal(none, null);
  });

  it("flattens Coder 4 feed leaders without inventing ranks", () => {
    const fromLeaders = attendanceLeadersFromCoder4Feed({
      leaders: [{ alumId: "a", attendanceCount: 4, rank: 1, percentile: 100, cohortSize: 10 }],
      rows: [
        {
          eventId: "e1",
          alumId: "a",
          userId: "a",
          checkedInAt: "2026-04-01T16:00:00.000Z",
          attendanceCount: 4,
          rank: 99,
          percentile: 1,
        },
      ],
    });
    assert.equal(fromLeaders[0]?.percentile, 100);
    const fromRows = attendanceLeadersFromCoder4Feed({
      rows: [
        {
          eventId: "e1",
          eventSlug: "spring-game",
          eventTitle: "Spring Game",
          alumId: "b",
          userId: "b",
          checkedInAt: "2026-04-01T16:00:00.000Z",
          attendanceCount: 2,
          rank: 5,
          percentile: 80,
          cohortSize: 20,
        },
      ],
    });
    assert.deepEqual(fromRows, [
      { alumId: "b", userId: "b", attendanceCount: 2, rank: 5, percentile: 80, cohortSize: 20 },
    ]);
  });

  it("consumes GET /api/events/attendance/feed { alum, feed } without inventing ranks", () => {
    const payload = {
      alum: { alumId: "a", userId: "a", attendanceCount: 4, rank: 1, percentile: 100, cohortSize: 10 },
      feed: {
        version: 1,
        attendanceCountScope: "lifetime",
        rankBasis: "lifetime_all_events",
        rows: [
          {
            eventId: "e1",
            eventSlug: "spring-game",
            eventTitle: "Spring Game",
            alumId: "a",
            userId: "a",
            checkedInAt: "2026-04-01T16:00:00.000Z",
            attendanceCount: 4,
            rank: 1,
            percentile: 100,
            cohortSize: 10,
          },
        ],
        leaders: [],
      },
    };
    const feed = eventBadgeFeedFromCoder4Json(payload);
    assert.equal(feed?.rows?.[0]?.eventSlug, "spring-game");
    const leaders = attendanceLeadersFromCoder4Feed(payload);
    assert.deepEqual(leaders, [payload.alum]);
    assert.equal(JSON.stringify(leaders).includes("$"), false);
  });

  it("resolves roster ids from alum:<uuid> personKey when alumId is missing", () => {
    const alumId = "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136";
    assert.equal(resolveFeedAlumId({ alumId: null, personKey: `alum:${alumId}` }), alumId);
    assert.equal(resolveFeedAlumId({ alumId: "", userId: alumId }), alumId);
    const leaders = attendanceLeadersFromCoder4Feed({
      leaders: [
        {
          alumId: null,
          personKey: `alum:${alumId}`,
          userId: alumId,
          attendanceCount: 4,
          rank: 1,
          percentile: 100,
          cohortSize: 8,
        },
      ],
    });
    assert.equal(leaders[0]?.alumId, alumId);
    assert.deepEqual(eventBadgeFromCoder4Totals(leaders[0]), {
      type: "event_top_platinum",
      label: "Top Tailgate · Platinum",
      tier: "platinum",
    });
  });

  it("builds Coder 4 eventSlug from title + eventId", () => {
    assert.equal(eventSlugFromTitle("Spring Game", "aaaaaaaa-bbbb-cccc-dddd-eeeeffff0000"), "spring-game-aaaaaaaa");
    assert.equal(eventSlugFromTitle("", "evt-1"), "evt-1");
  });
});
