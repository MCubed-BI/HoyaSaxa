import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classYearLabel,
  displayName,
  formatCount,
  locationLabel,
  parseLocationInput,
  positionLabel,
  residenceLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatRelativeTime,
  pageWindow,
  parseDate,
  resultRange,
} from "./format";

test("keeps nickname plus last name", () => {
  assert.equal(
    displayName({
      preferred_name: "Rob",
      first_name: "Robert",
      last_name: "Sgarlata",
      full_name: "Robert Sgarlata",
    }),
    "Rob Sgarlata",
  );
});

test("title-cases ALL CAPS names and survives missing first or last", () => {
  assert.equal(
    displayName({
      preferred_name: null,
      first_name: "JOHN",
      last_name: "SMITH",
      full_name: "JOHN SMITH",
    }),
    "John Smith",
  );
  assert.equal(
    displayName({
      preferred_name: null,
      first_name: null,
      last_name: "Kasten",
      full_name: null,
    }),
    "Kasten",
  );
  assert.equal(
    displayName({
      preferred_name: null,
      first_name: "Pat",
      last_name: "",
      full_name: null,
    }),
    "Pat",
  );
});

test("parses packed current_state and hides empty city/state", () => {
  assert.equal(locationLabel(null, "Washington, District of Columbia, United States"), "Washington, DC");
  assert.equal(locationLabel(null, "Arlington, VA"), "Arlington, VA");
  assert.equal(locationLabel(null, "TX"), "TX");
  assert.equal(locationLabel("Dallas", "Texas"), "Dallas, TX");
  assert.equal(locationLabel("Washington", null), "Washington");
  assert.equal(locationLabel(null, null), null);
  assert.equal(locationLabel("", "n/a"), null);
  assert.equal(residenceLabel({ current_city: null, current_state: null, hometown_city: "Boston", hometown_state: "MA" }), "Boston, MA");
});

test("parses typed Overview locations", () => {
  assert.deepEqual(parseLocationInput("New York, NY"), { city: "New York", state: "NY" });
  assert.deepEqual(parseLocationInput("New York NY"), { city: "New York", state: "NY" });
  assert.deepEqual(parseLocationInput("  "), { city: null, state: null });
});

test("omits empty positions and only title-cases long forms", () => {
  assert.equal(positionLabel(null), null);
  assert.equal(positionLabel("n/a"), null);
  assert.equal(positionLabel("qb"), "QB");
  assert.equal(positionLabel("WIDE RECEIVER"), "Wide Receiver");
  assert.equal(positionLabel("Wide Receiver"), "Wide Receiver");
  assert.equal(positionLabel("OL/DL"), "OL / DL");
});

test("hides empty class years and formats real ones", () => {
  assert.equal(classYearLabel(null), null);
  assert.equal(classYearLabel(""), null);
  assert.equal(classYearLabel("2015"), "Class of 2015");
  assert.equal(classYearLabel("Jr."), "Jr.");
});

test("parseDate rejects empty and invalid values", () => {
  assert.equal(parseDate(null), null);
  assert.equal(parseDate(""), null);
  assert.equal(parseDate("not-a-date"), null);
  assert.ok(parseDate("2026-09-19T15:00:00.000Z"));
});

test("formats Eastern dates and datetimes", () => {
  assert.equal(formatDate("2026-10-04T22:00:00.000Z"), "Oct 4, 2026");
  assert.equal(formatDateTime("2026-10-04T22:00:00.000Z"), "Sun, Oct 4, 2026 · 6:00 PM ET");
  assert.equal(formatDate("nope"), null);
});

test("formats relative time from a fixed now", () => {
  const now = Date.parse("2026-09-19T18:00:00.000Z");
  assert.equal(formatRelativeTime("2026-09-19T17:59:30.000Z", now), "now");
  assert.equal(formatRelativeTime("2026-09-19T17:10:00.000Z", now), "50 minutes ago");
  assert.equal(formatRelativeTime("2026-09-19T16:00:00.000Z", now), "2 hours ago");
  assert.equal(formatRelativeTime("2026-09-18T18:00:00.000Z", now), "yesterday");
});

test("formats numbers, counts, and currency from cents", () => {
  assert.equal(formatNumber(1204), "1,204");
  assert.equal(formatNumber(null), "—");
  assert.equal(formatCount(1, "person", "people"), "1 person");
  assert.equal(formatCount(24, "person", "people"), "24 people");
  assert.equal(formatCurrency(2500), "$25");
  assert.equal(formatCurrency(2575), "$25.75");
  assert.equal(formatCurrency(0), "$0");
});

test("result ranges and page windows", () => {
  assert.deepEqual(resultRange(2, 24, 50), {
    start: 25,
    end: 48,
    label: "Showing 25–48 of 50",
  });
  assert.deepEqual(resultRange(1, 24, 0), { start: 0, end: 0, label: "0 results" });
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(5, 10), [1, "ellipsis", 3, 4, 5, 6, 7, "ellipsis", 10]);
});
