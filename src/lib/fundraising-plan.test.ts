import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BENEFIT_LADDER,
  GIFT_BANDS,
  GIVING_PIECES,
  ONE_TIME_AMOUNT_DOLLARS,
  TAILGATE_SPONSORSHIP,
  giftBandForDollars,
  normalizeGivingPiece,
} from "./fundraising-plan";

test("three giving pieces only", () => {
  assert.deepEqual(
    GIVING_PIECES.map((row) => row.id),
    ["one_time", "letterman_jacket", "tailgate"],
  );
  assert.deepEqual(
    GIVING_PIECES.map((row) => row.href),
    ["/giving/one-time", "/giving/letterman", "/giving/tailgate"],
  );
});

test("one-time amounts are plain gift presets", () => {
  assert.deepEqual(ONE_TIME_AMOUNT_DOLLARS, [250, 500, 750]);
});

test("gift bands keep Bronze / Silver / Gold breakdowns for leaderboard", () => {
  assert.equal(GIFT_BANDS.length, 3);
  assert.equal(giftBandForDollars(250)?.id, "bronze");
  assert.equal(giftBandForDollars(500)?.id, "silver");
  assert.equal(giftBandForDollars(750)?.id, "gold");
});

test("benefit ladder has five rungs", () => {
  assert.equal(BENEFIT_LADDER.length, 5);
  assert.equal(BENEFIT_LADDER[0]?.id, "founders");
  assert.equal(BENEFIT_LADDER.at(-1)?.id, "letterwinner");
});

test("maps legacy designations onto the three pieces", () => {
  assert.equal(normalizeGivingPiece("subscription"), "one_time");
  assert.equal(normalizeGivingPiece("recurring"), "one_time");
  assert.equal(normalizeGivingPiece("general"), "one_time");
  assert.equal(normalizeGivingPiece("letterman_jacket"), "letterman_jacket");
  assert.equal(normalizeGivingPiece("tailgate"), "tailgate");
});

test("tailgate sponsorship defaults", () => {
  assert.deepEqual([...TAILGATE_SPONSORSHIP.amountDollars], [250, 500, 1000, 5000]);
});
