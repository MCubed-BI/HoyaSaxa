import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GIVING_PIECES,
  RECURRING_AMOUNT_DOLLARS,
  TAILGATE_SPONSORSHIP,
  normalizeGivingPiece,
  recurringLabelForDollars,
} from "./fundraising-plan";

test("three giving pieces only", () => {
  assert.deepEqual(
    GIVING_PIECES.map((row) => row.id),
    ["recurring", "letterman_jacket", "tailgate"],
  );
  assert.deepEqual(
    GIVING_PIECES.map((row) => row.href),
    ["/giving/recurring", "/giving/letterman", "/giving/tailgate"],
  );
});

test("recurring amounts are Bronze / Silver / Gold", () => {
  assert.deepEqual(RECURRING_AMOUNT_DOLLARS, [250, 500, 750]);
  assert.equal(recurringLabelForDollars(250), "Bronze");
  assert.equal(recurringLabelForDollars(500), "Silver");
  assert.equal(recurringLabelForDollars(750), "Gold");
});

test("maps legacy designations onto the three pieces", () => {
  assert.equal(normalizeGivingPiece("subscription"), "recurring");
  assert.equal(normalizeGivingPiece("general"), "recurring");
  assert.equal(normalizeGivingPiece("coaches_fund"), "recurring");
  assert.equal(normalizeGivingPiece("letterman_jacket"), "letterman_jacket");
  assert.equal(normalizeGivingPiece("tailgate"), "tailgate");
});

test("tailgate sponsorship defaults", () => {
  assert.deepEqual([...TAILGATE_SPONSORSHIP.amountDollars], [250, 500, 1000, 5000]);
});
