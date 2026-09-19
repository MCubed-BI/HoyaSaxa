import assert from "node:assert/strict";
import { test } from "node:test";
import { alumniFilterChips, emptyFilters, hasActiveFilters } from "./filters";

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
});

test("alumniFilterChips keeps extra query params", () => {
  const chips = alumniFilterChips({ ...emptyFilters(), q: "Hoyas" }, "/blast", { channel: "email" });
  assert.ok(chips[0]?.href.includes("channel=email"));
  assert.ok(chips[0]?.href.startsWith("/blast?"));
});
