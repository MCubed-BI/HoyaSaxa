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

test("normalizes known designations onto giving pieces", () => {
  assert.equal(normalizeDesignation("five_year"), "five_year");
  assert.equal(normalizeDesignation("five_year_commitment"), "five_year");
  assert.equal(normalizeDesignation("tailgate"), "tailgate");
  assert.equal(normalizeDesignation("letterman_jacket"), "letterman_jacket");
  assert.equal(normalizeDesignation("one_time"), "one_time");
  assert.equal(normalizeDesignation("recurring"), "one_time");
  assert.equal(normalizeDesignation("subscription"), "one_time");
  assert.equal(normalizeDesignation("nope"), "one_time");
});

test("resolves five-year annual commitment amounts", () => {
  const ok = resolveGivingPledgeInput({
    designation: "five_year",
    amountDollars: 25_000,
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.amountCents, 2_500_000);
    assert.equal(ok.details.annualDollars, 25_000);
  }

  const bad = resolveGivingPledgeInput({
    designation: "five_year",
    amountDollars: 2_500,
  });
  assert.equal(bad.ok, false);
});

test("resolves letterman sponsor and purchase with suit size", () => {
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

test("resolves tailgate per-game and entire-event sponsorship", () => {
  const missingGame = resolveGivingPledgeInput({
    designation: "tailgate",
    amountDollars: 250,
    tailgateMode: "per_game",
  });
  assert.equal(missingGame.ok, false);

  const perGame = resolveGivingPledgeInput({
    designation: "tailgate",
    amountDollars: 250,
    tailgateMode: "per_game",
    tailgateGame: "vs. Holy Cross",
  });
  assert.equal(perGame.ok, true);
  if (perGame.ok) {
    assert.equal(perGame.amountCents, 25_000);
    assert.equal(perGame.details.tailgateGame, "vs. Holy Cross");
    assert.equal(perGame.details.tailgateMode, "per_game");
    assert.equal(perGame.details.tailgateTheme, undefined);
  }

  const entire = resolveGivingPledgeInput({
    designation: "tailgate",
    amountDollars: 4_000,
    tailgateMode: "entire_event",
  });
  assert.equal(entire.ok, true);
  if (entire.ok) {
    assert.equal(entire.amountCents, 400_000);
    assert.equal(entire.details.tailgateMode, "entire_event");
    assert.equal(entire.details.tailgateGame, undefined);
  }
});

test("formats pledge purpose labels", () => {
  assert.equal(
    formatPledgePurpose({
      designation: "five_year",
      amount_cents: 2_500_000,
      details: { annualDollars: 25_000 },
    }),
    "5-Year · $25,000/yr",
  );
  assert.equal(
    formatPledgePurpose({
      designation: "letterman_jacket",
      amount_cents: 24_000,
      details: { jacketVariant: "self", suitSize: "44" },
    }),
    "Letterman · Purchase · size 44",
  );
  assert.equal(
    formatPledgePurpose({
      designation: "letterman_jacket",
      amount_cents: 20_000,
      details: { jacketVariant: "donate" },
    }),
    "Letterman · Sponsor",
  );
  assert.equal(
    formatPledgePurpose({
      designation: "tailgate",
      amount_cents: 25_000,
      details: { tailgateGame: "vs. Holy Cross", tailgateMode: "per_game" },
    }),
    "Tailgate · vs. Holy Cross",
  );
  assert.equal(
    formatPledgePurpose({
      designation: "tailgate",
      amount_cents: 400_000,
      details: { tailgateMode: "entire_event" },
    }),
    "Tailgate · Entire event",
  );
  assert.equal(
    formatPledgePurpose({
      designation: "one_time",
      amount_cents: 25_000,
      details: {},
    }),
    "One-time",
  );
});
