import assert from "node:assert/strict";
import { test } from "node:test";
import { dollarsToCents, normalizeDonorLabel } from "./giving";

test("maps impact amounts to cents", () => {
  assert.equal(dollarsToCents(25), 2500);
  assert.equal(dollarsToCents(50), 5000);
  assert.equal(dollarsToCents(100), 10000);
  assert.equal(dollarsToCents(250), 25000);
  assert.equal(dollarsToCents("75"), 7500);
});

test("rejects empty or out-of-range amounts", () => {
  assert.equal(dollarsToCents(""), null);
  assert.equal(dollarsToCents(0), null);
  assert.equal(dollarsToCents(-5), null);
  assert.equal(dollarsToCents("abc"), null);
});

test("trims optional donor labels", () => {
  assert.equal(normalizeDonorLabel("  Hoya  "), "Hoya");
  assert.equal(normalizeDonorLabel("   "), null);
  assert.equal(normalizeDonorLabel(12), null);
});
