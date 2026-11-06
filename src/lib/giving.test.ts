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

test("normalizes known designations onto three pieces", () => {
  assert.equal(normalizeDesignation("tailgate"), "tailgate");
  assert.equal(normalizeDesignation("letterman_jacket"), "letterman_jacket");
  assert.equal(normalizeDesignation("recurring"), "recurring");
  assert.equal(normalizeDesignation("subscription"), "recurring");
  assert.equal(normalizeDesignation("nope"), "recurring");
});

test("resolves letterman donate and self with suit size", () => {
  const donate = resolveGivingPledgeInput({
    designation: "letterman_jacket",
    jacketVariant: "donate",
  });
  assert.equal(donate.ok, true);
  if (donate.ok) {
    assert.equal(donate.amountCents, 20_000);
    assert.equal(donate.details.jacketVariant, "donate");
  }

  const legacy = resolveGivingPledgeInput({
    designation: "letterman_jacket",
    jacketVariant: "player_sponsor",
  });
  assert.equal(legacy.ok, true);
  if (legacy.ok) {
    assert.equal(legacy.amountCents, 20_000);
    assert.equal(legacy.details.jacketVariant, "donate");
  }

  const missingSize = resolveGivingPledgeInput({
    designation: "letterman_jacket",
    jacketVariant: "self",
  });
  assert.equal(missingSize.ok, false);

  const self = resolveGivingPledgeInput({
    designation: "letterman_jacket",
    jacketVariant: "self",
    suitSize: "42R",
  });
  assert.equal(self.ok, true);
  if (self.ok) {
    assert.equal(self.amountCents, 24_000);
    assert.equal(self.details.suitSize, "42R");
  }

  const freeform = resolveGivingPledgeInput({
    designation: "letterman_jacket",
    jacketVariant: "self",
    suitSize: "  men's XL tall  ",
  });
  assert.equal(freeform.ok, true);
  if (freeform.ok) {
    assert.equal(freeform.details.suitSize, "men's XL tall");
  }
});

test("resolves tailgate game and theme modes", () => {
  const missing = resolveGivingPledgeInput({
    designation: "tailgate",
    amountDollars: 500,
    tailgateMode: "theme",
  });
  assert.equal(missing.ok, false);

  const theme = resolveGivingPledgeInput({
    designation: "tailgate",
    amountDollars: 1000,
    tailgateMode: "theme",
    tailgateTheme: "Homecoming",
  });
  assert.equal(theme.ok, true);
  if (theme.ok) {
    assert.equal(theme.amountCents, 100_000);
    assert.equal(theme.details.tailgateMode, "theme");
    assert.equal(theme.details.tailgateTheme, "Homecoming");
    assert.equal(theme.details.tailgateGame, undefined);
  }

  const game = resolveGivingPledgeInput({
    designation: "tailgate",
    amountDollars: 250,
    tailgateMode: "game",
    tailgateGame: "vs. Holy Cross",
  });
  assert.equal(game.ok, true);
  if (game.ok) {
    assert.equal(game.details.tailgateMode, "game");
    assert.equal(game.details.tailgateGame, "vs. Holy Cross");
    assert.equal(game.details.tailgateTheme, undefined);
  }
});

test("formats pledge purpose labels", () => {
  assert.equal(
    formatPledgePurpose({
      designation: "letterman_jacket",
      amount_cents: 24_000,
      details: { jacketVariant: "self", suitSize: "44" },
    }),
    "Letterman · For Self · size 44",
  );
  assert.equal(
    formatPledgePurpose({
      designation: "tailgate",
      amount_cents: 50_000,
      details: { tailgateMode: "theme", tailgateTheme: "Spring Game" },
    }),
    "Tailgate · Theme · Spring Game",
  );
  assert.equal(
    formatPledgePurpose({
      designation: "recurring",
      amount_cents: 25_000,
      details: {},
    }),
    "Recurring",
  );
});
