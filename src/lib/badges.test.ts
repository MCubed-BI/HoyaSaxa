import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BADGE_PERCENTILE_THRESHOLDS,
  BADGE_TYPES,
  assemblePublicBadges,
  donorTierForAlumniId,
  eventTierForAlumniId,
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
    assert.equal(donorTierForAlumniId("missing", totals), null);
    assert.equal(eventTierForAlumniId("a", [{ key: "a", checkins: 8 }, { key: "b", checkins: 1 }]), "platinum");
    const json = publicBadgesJson([toPublicBadge("donor_gold")]);
    assert.deepEqual(json, [{ type: "donor_gold", label: "Donor · Gold", tier: "gold" }]);
    assert.equal(JSON.stringify(json).includes("cent"), false);
    assert.equal(JSON.stringify(json).includes("$"), false);
  });

  it("assembles verified + donor + event chips without gift totals", () => {
    const badges = assemblePublicBadges({
      verified: true,
      donorTier: "platinum",
      eventTier: "gold",
    });
    assert.deepEqual(
      badges.map((badge) => badge.label),
      ["Verified Hoya", "Donor · Platinum", "Event top · Gold"],
    );
    assert.equal(JSON.stringify(badges).includes("$"), false);
    assert.equal(JSON.stringify(badges).includes("cent"), false);
  });
});
