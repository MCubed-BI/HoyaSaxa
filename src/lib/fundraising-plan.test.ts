import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BENEFIT_LADDER,
  SUBSCRIPTION_AMOUNT_DOLLARS,
  SUBSCRIPTION_RANKS,
  TAILGATE_SPONSORSHIP,
  subscriptionRankForDollars,
} from "./fundraising-plan";

test("subscription ranks match Bronze / Silver / Gold asks", () => {
  assert.deepEqual(SUBSCRIPTION_AMOUNT_DOLLARS, [250, 500, 750]);
  assert.equal(subscriptionRankForDollars(250)?.id, "bronze");
  assert.equal(subscriptionRankForDollars(500)?.id, "silver");
  assert.equal(subscriptionRankForDollars(750)?.id, "gold");
  assert.equal(SUBSCRIPTION_RANKS.length, 3);
});

test("benefit ladder has five rungs with Founders at the top", () => {
  assert.equal(BENEFIT_LADDER.length, 5);
  assert.equal(BENEFIT_LADDER[0]?.id, "founders");
  assert.equal(BENEFIT_LADDER[0]?.amountDollars, 25_000);
  assert.equal(BENEFIT_LADDER.at(-1)?.id, "letterwinner");
});

test("tailgate sponsorship defaults", () => {
  assert.deepEqual([...TAILGATE_SPONSORSHIP.amountDollars], [250, 500, 1000, 5000]);
});
