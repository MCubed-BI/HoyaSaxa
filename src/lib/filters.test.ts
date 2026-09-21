import assert from "node:assert/strict";
import { test } from "node:test";
import {
  alumniFilterChips,
  canonicalizeAlumniFilters,
  coerceAlumniFilters,
  emptyFilters,
  expandAlumniFilters,
  facetFilterCount,
  hasActiveFilters,
  hasFacetFilters,
  parseAlumniFilters,
  parseHighlightId,
} from "./filters";

test("alumniFilterChips builds removable chips", () => {
  const chips = alumniFilterChips({
    ...emptyFilters(),
    q: "Kasten",
    states: ["VA", "DC"],
    hasEmail: true,
  });
  assert.equal(chips.length, 4);
  assert.ok(chips.some((chip) => chip.label === "Search: Kasten" && chip.href === "/?state=VA&state=DC&hasEmail=1"));
  assert.ok(chips.some((chip) => chip.id === "state-VA" && !chip.href.includes("state=VA")));
  assert.ok(hasActiveFilters({ ...emptyFilters(), q: "Kasten" }));
  assert.equal(hasActiveFilters(emptyFilters()), false);
  assert.equal(hasFacetFilters({ ...emptyFilters(), q: "Kasten" }), false);
  assert.equal(hasFacetFilters({ ...emptyFilters(), states: ["VA"] }), true);
  assert.equal(facetFilterCount({ ...emptyFilters(), states: ["VA", "DC"], hasEmail: true }), 3);
  assert.equal(parseHighlightId({ highlight: "abc" }), "abc");
});

test("parseAlumniFilters canonicalizes dirty state and city values", () => {
  const filters = parseAlumniFilters({
    q: " Kasten ",
    state: ["ca", "GA", "gA"],
    city: ["BOston", "#REF!"],
    position: ["Offensive Line", "OL"],
  });
  assert.equal(filters.q, "Kasten");
  assert.deepEqual(filters.states, ["CA", "GA"]);
  assert.deepEqual(filters.cities, ["Boston"]);
  assert.deepEqual(filters.positions, ["OL"]);
});

test("expandAlumniFilters keeps canonical URL values but matches raw aliases", () => {
  const expanded = expandAlumniFilters(
    canonicalizeAlumniFilters({
      ...emptyFilters(),
      states: ["ca"],
      cities: ["BOston"],
      positions: ["Offensive Line"],
    }),
    {
      states: { CA: ["CA", "ca", "CA ::: CA"] },
      cities: { Boston: ["Boston", "BOston", "123 Main St, Boston, MA"] },
      positions: { OL: ["OL", "Offensive Line"] },
      classYears: {},
    },
  );
  assert.ok(expanded.states.includes("CA"));
  assert.ok(expanded.states.includes("CA ::: CA"));
  assert.ok(expanded.cities.includes("123 Main St, Boston, MA"));
  assert.ok(expanded.positions.includes("Offensive Line"));
});

test("coerceAlumniFilters drops spreadsheet junk", () => {
  const filters = coerceAlumniFilters({
    q: "blast",
    states: ["#REF!", "Va"],
    cities: ["#REF!"],
    positions: ["n/a"],
    classYears: ["2015"],
    seasonYears: ["2019"],
  });
  assert.deepEqual(filters.states, ["VA"]);
  assert.deepEqual(filters.cities, []);
  assert.deepEqual(filters.positions, []);
  assert.deepEqual(filters.classYears, ["2015"]);
});
