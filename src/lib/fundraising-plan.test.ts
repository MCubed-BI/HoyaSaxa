import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BENEFIT_LADDER,
  FIVE_YEAR_AMOUNT_DOLLARS,
  GIFT_BANDS,
  GIVING_PIECES,
  ONE_TIME_AMOUNT_DOLLARS,
  TAILGATE_SPONSORSHIP,
  giftBandForDollars,
  normalizeGivingPiece,
} from "./fundraising-plan";

test("giving pieces lead with 5-year commitment", () => {
  assert.deepEqual(
    GIVING_PIECES.map((row) => row.id),
    ["five_year", "one_time", "letterman_jacket", "tailgate"],
  );
  assert.deepEqual(
    GIVING_PIECES.map((row) => row.href),
    ["/giving/five-year", "/giving/one-time", "/giving/letterman", "/giving/tailgate"],
  );
  assert.equal(GIVING_PIECES[0]?.summary.includes("25k"), true);
  assert.equal(GIVING_PIECES.find((row) => row.id === "letterman_jacket")?.summary, "Letter Jacket Sponsor or Purchase.");
  assert.equal(
    GIVING_PIECES.find((row) => row.id === "tailgate")?.summary,
    "$250 ea or $4,000 Sponsor entire event.",
  );
});

test("one-time amounts are plain gift presets", () => {
  assert.deepEqual(ONE_TIME_AMOUNT_DOLLARS, [250, 500, 750]);
});

test("five-year annual amounts", () => {
  assert.deepEqual(FIVE_YEAR_AMOUNT_DOLLARS, [25_000, 10_000, 5_000, 1_000]);
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

test("maps legacy designations onto the giving pieces", () => {
  assert.equal(normalizeGivingPiece("subscription"), "one_time");
  assert.equal(normalizeGivingPiece("recurring"), "one_time");
  assert.equal(normalizeGivingPiece("general"), "one_time");
  assert.equal(normalizeGivingPiece("five_year_commitment"), "five_year");
  assert.equal(normalizeGivingPiece("commitment"), "five_year");
  assert.equal(normalizeGivingPiece("letterman_jacket"), "letterman_jacket");
  assert.equal(normalizeGivingPiece("tailgate"), "tailgate");
});

test("tailgate sponsorship defaults", () => {
  assert.equal(TAILGATE_SPONSORSHIP.perGameDollars, 250);
  assert.equal(TAILGATE_SPONSORSHIP.entireEventDollars, 4_000);
  assert.deepEqual([...TAILGATE_SPONSORSHIP.amountDollars], [250, 4_000]);
});
