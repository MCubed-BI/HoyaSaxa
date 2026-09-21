import assert from "node:assert/strict";
import { test } from "node:test";
import {
  expandFilterSelection,
  groupFilterOptions,
  normalizeFilterCity,
  normalizeFilterClassYear,
  normalizeFilterPosition,
  normalizeFilterState,
  uniqueCanonicalValues,
} from "./filter-normalize";

test("normalizes state case, junk, and repeated spreadsheet tokens", () => {
  assert.equal(normalizeFilterState("CA"), "CA");
  assert.equal(normalizeFilterState("ca"), "CA");
  assert.equal(normalizeFilterState("CA ::: CA"), "CA");
  assert.equal(normalizeFilterState("CA ::: CA ::: CA"), "CA");
  assert.equal(normalizeFilterState("::: TX"), "TX");
  assert.equal(normalizeFilterState("FL :::"), "FL");
  assert.equal(normalizeFilterState("Texas :::"), "TX");
  assert.equal(normalizeFilterState("NJ ::: New Jersey"), "NJ");
  assert.equal(normalizeFilterState("75249 ::: IA"), "IA");
  assert.equal(normalizeFilterState("CT ::: NY"), null);
  assert.equal(normalizeFilterState("--"), null);
  assert.equal(normalizeFilterState(":::"), null);
  assert.equal(normalizeFilterState("GA"), "GA");
  assert.equal(normalizeFilterState("Ga"), "GA");
  assert.equal(normalizeFilterState("ga"), "GA");
  assert.equal(normalizeFilterState("gA"), "GA");
  assert.equal(normalizeFilterState("California"), "CA");
  assert.equal(normalizeFilterState("Washington, District of Columbia, United States"), "DC");
  assert.equal(normalizeFilterState("#REF!"), null);
  assert.equal(normalizeFilterState("n/a"), null);
  assert.equal(normalizeFilterState("  "), null);
  assert.equal(normalizeFilterState("Ontario"), "Ontario");
  assert.equal(normalizeFilterState("Phoenix, Arizona, United States"), "AZ");
  assert.equal(normalizeFilterState("Amsterdam, North Holland, Netherlands"), null);
});

test("normalizes city case and strips address fragments", () => {
  assert.equal(normalizeFilterCity("Boston"), "Boston");
  assert.equal(normalizeFilterCity("BOston"), "Boston");
  assert.equal(normalizeFilterCity("boston"), "Boston");
  assert.equal(normalizeFilterCity("Arlington ::: Arlington"), "Arlington");
  assert.equal(normalizeFilterCity("::: Fort Collins ::: ::: Fort Collins"), "Fort Collins");
  assert.equal(normalizeFilterCity("Dallas :::"), "Dallas");
  assert.equal(normalizeFilterCity("Dallas ::: Iowa City"), null);
  assert.equal(normalizeFilterCity(":::"), null);
  assert.equal(normalizeFilterCity("Boston, MA"), "Boston");
  assert.equal(normalizeFilterCity("Boston MA 02115"), "Boston");
  assert.equal(normalizeFilterCity("123 Main St, Boston, MA"), "Boston");
  assert.equal(normalizeFilterCity("1234 Wisconsin Ave NW"), null);
  assert.equal(normalizeFilterCity("CA"), null);
  assert.equal(normalizeFilterCity("CA ::: CA"), null);
  assert.equal(normalizeFilterCity("#REF!"), null);
  assert.equal(normalizeFilterCity("St. Louis"), "St. Louis");
  assert.equal(normalizeFilterCity("washington"), "Washington");
});

test("collapses safe position synonyms and keeps combo positions", () => {
  assert.equal(normalizeFilterPosition("OL"), "OL");
  assert.equal(normalizeFilterPosition("ol"), "OL");
  assert.equal(normalizeFilterPosition("Offensive Line"), "OL");
  assert.equal(normalizeFilterPosition("OFFENSIVE LINE"), "OL");
  assert.equal(normalizeFilterPosition("Wide Receiver"), "WR");
  assert.equal(normalizeFilterPosition("qb"), "QB");
  assert.equal(normalizeFilterPosition("OL/DL"), "OL / DL");
  assert.equal(normalizeFilterPosition("#REF!"), null);
  assert.equal(normalizeFilterPosition("Student Assistant"), "Student Assistant");
});

test("drops junk class years", () => {
  assert.equal(normalizeFilterClassYear("2015"), "2015");
  assert.equal(normalizeFilterClassYear("#REF!"), null);
  assert.equal(normalizeFilterClassYear("n/a"), null);
});

test("groups dirty values onto one display option and expands aliases for matching", () => {
  const states = groupFilterOptions(["CA", "ca", "CA ::: CA", "GA", "Ga", "ga", "gA", "#REF!"], normalizeFilterState);
  assert.deepEqual(states.options, ["CA", "GA"]);
  assert.ok(states.aliases.CA?.includes("CA ::: CA"));
  assert.ok(states.aliases.GA?.includes("gA"));

  const cities = groupFilterOptions(["Boston", "BOston", "123 Main St, Boston, MA", "#REF!"], normalizeFilterCity);
  assert.deepEqual(cities.options, ["Boston"]);

  const positions = groupFilterOptions(["OL", "Offensive Line", "WR"], normalizeFilterPosition);
  assert.deepEqual(positions.options, ["OL", "WR"]);

  const expanded = expandFilterSelection(["CA"], states.aliases, normalizeFilterState);
  assert.ok(expanded.includes("CA"));
  assert.ok(expanded.includes("ca"));
  assert.ok(expanded.includes("CA ::: CA"));

  assert.deepEqual(uniqueCanonicalValues(["ca", "CA", "GA", "ga"], normalizeFilterState), ["CA", "GA"]);
});
