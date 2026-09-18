import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expandTwoDigitYear,
  normalizeLastName,
  parseClassYearInput,
  storedClassYearMatches,
} from "./alumni-class-year";

describe("parseClassYearInput", () => {
  it("accepts 2015, '15, ’15, and 15", () => {
    assert.equal(parseClassYearInput("2015"), "2015");
    assert.equal(parseClassYearInput("'15"), "2015");
    assert.equal(parseClassYearInput("’15"), "2015");
    assert.equal(parseClassYearInput("15"), "2015");
    assert.equal(parseClassYearInput("class of ’15"), "2015");
  });

  it("maps two-digit years before the cutoff to 1900s", () => {
    assert.equal(parseClassYearInput("'68"), "1968");
    assert.equal(expandTwoDigitYear("99"), "1999");
  });

  it("returns null for empty or non-year text", () => {
    assert.equal(parseClassYearInput(""), null);
    assert.equal(parseClassYearInput("OL"), null);
  });
});

describe("storedClassYearMatches", () => {
  it("matches 4-digit and roster-style stored values", () => {
    assert.equal(storedClassYearMatches("2015", "2015"), true);
    assert.equal(storedClassYearMatches("B'04", "2004"), true);
    assert.equal(storedClassYearMatches("C'32", "2032"), true);
    assert.equal(storedClassYearMatches("2014", "2015"), false);
  });
});

describe("normalizeLastName", () => {
  it("trims and collapses spaces", () => {
    assert.equal(normalizeLastName("  Kasten  "), "Kasten");
    assert.equal(normalizeLastName("Van  der Meer"), "Van der Meer");
  });
});
