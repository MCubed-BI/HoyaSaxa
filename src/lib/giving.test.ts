import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dollarsToCents,
  formatPledgePurpose,
  normalizeDesignation,
  normalizeDonorLabel,
  resolveGivingPledgeInput,
} from "./giving";

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

test("normalizes known designations", () => {
  assert.equal(normalizeDesignation("tailgate"), "tailgate");
  assert.equal(normalizeDesignation("letterman_jacket"), "letterman_jacket");
  assert.equal(normalizeDesignation("nope"), "general");
});

test("resolves letterman jacket player sponsor and self with suit size", () => {
  const player = resolveGivingPledgeInput({
    designation: "letterman_jacket",
    jacketVariant: "player_sponsor",
  });
  assert.equal(player.ok, true);
  if (player.ok) {
    assert.equal(player.amountCents, 20_000);
    assert.equal(player.details.jacketVariant, "player_sponsor");
  }

  const missingSize = resolveGivingPledgeInput({
    designation: "letterman_jacket",
    jacketVariant: "self",
  });
  assert.equal(missingSize.ok, false);

  const self = resolveGivingPledgeInput({
    designation: "letterman_jacket",
    jacketVariant: "self",
    suitSize: "42",
  });
  assert.equal(self.ok, true);
  if (self.ok) {
    assert.equal(self.amountCents, 24_000);
    assert.equal(self.details.suitSize, "42");
  }
});

test("resolves tailgate sponsorship with theme and presets", () => {
  const missing = resolveGivingPledgeInput({
    designation: "tailgate",
    amountDollars: 500,
  });
  assert.equal(missing.ok, false);

  const ok = resolveGivingPledgeInput({
    designation: "tailgate",
    amountDollars: 1000,
    tailgateTheme: "Homecoming",
    tailgateGame: "vs. Holy Cross",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.amountCents, 100_000);
    assert.equal(ok.details.tailgateTheme, "Homecoming");
    assert.equal(ok.details.tailgateGame, "vs. Holy Cross");
  }
});

test("formats pledge purpose labels", () => {
  assert.equal(
    formatPledgePurpose({
      designation: "letterman_jacket",
      amount_cents: 24_000,
      details: { jacketVariant: "self", suitSize: "44" },
    }),
    "Letterman Jacket · For Self · size 44",
  );
  assert.equal(
    formatPledgePurpose({
      designation: "tailgate",
      amount_cents: 50_000,
      details: { tailgateTheme: "Spring Game" },
    }),
    "Tailgate sponsorship · Spring Game",
  );
});
