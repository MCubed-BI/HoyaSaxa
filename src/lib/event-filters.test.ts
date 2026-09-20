import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildEventFilterSql,
  emptyEventFilters,
  eventFilterChips,
  eventFiltersToSearchParams,
  eventsHref,
  hasExtraEventFilters,
  parseEventFilters,
} from "./event-filters";

test("parseEventFilters reads when/tab, search, and category", () => {
  assert.deepEqual(parseEventFilters({}), emptyEventFilters());
  assert.deepEqual(parseEventFilters({ when: "past", q: " tailgate ", category: "Social" }), {
    tab: "past",
    q: "tailgate",
    categories: ["Social"],
  });
  assert.deepEqual(parseEventFilters({ tab: "mine", category: ["Game", "Nope", "Reunion"] }), {
    tab: "mine",
    q: "",
    categories: ["Game", "Reunion"],
  });
});

test("eventsHref omits default upcoming and builds removable chips", () => {
  const filters = parseEventFilters({ q: "Cooper", category: "Social", tab: "past" });
  assert.equal(eventsHref(filters), "/events?tab=past&q=Cooper&category=Social");
  assert.equal(eventsHref({ ...filters, tab: "upcoming", q: "", categories: [] }), "/events");
  assert.equal(eventFiltersToSearchParams(emptyEventFilters()).toString(), "");
  assert.equal(hasExtraEventFilters(filters), true);
  assert.equal(hasExtraEventFilters(emptyEventFilters()), false);

  const chips = eventFilterChips(filters);
  assert.equal(chips.length, 2);
  assert.ok(chips.some((chip) => chip.id === "q" && chip.href === "/events?tab=past&category=Social"));
  assert.ok(chips.some((chip) => chip.id === "category-Social" && chip.href === "/events?tab=past&q=Cooper"));
});

test("buildEventFilterSql is parameterized and no-ops when empty", () => {
  assert.deepEqual(buildEventFilterSql(4, emptyEventFilters()), { sql: "", params: [], nextIndex: 4 });
  const filtered = buildEventFilterSql(4, { q: "homecoming", categories: ["Game"] });
  assert.match(filtered.sql, /title ILIKE \$4/);
  assert.match(filtered.sql, /category = ANY\(\$5::text\[\]\)/);
  assert.deepEqual(filtered.params, ["%homecoming%", ["Game"]]);
  assert.equal(filtered.nextIndex, 6);
});
