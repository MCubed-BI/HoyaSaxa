import assert from "node:assert/strict";
import { test } from "node:test";
import { formatEventWhen, fromTimeZoneLocal, parseEventDateTime } from "@/lib/event-datetime";

test("Eastern daylight time converts to UTC", () => {
  const date = fromTimeZoneLocal("2026-10-04T18:00", "America/New_York");
  assert.ok(date);
  assert.equal(date.toISOString(), "2026-10-04T22:00:00.000Z");
});

test("Eastern standard time converts to UTC", () => {
  const date = fromTimeZoneLocal("2026-01-15T18:00", "America/New_York");
  assert.ok(date);
  assert.equal(date.toISOString(), "2026-01-15T23:00:00.000Z");
});

test("parseEventDateTime accepts datetime-local and ISO", () => {
  const local = parseEventDateTime("2026-10-04T18:00");
  assert.ok(local);
  assert.equal(local.toISOString(), "2026-10-04T22:00:00.000Z");
  const iso = parseEventDateTime("2026-10-04T22:00:00.000Z");
  assert.ok(iso);
  assert.equal(iso.toISOString(), "2026-10-04T22:00:00.000Z");
  assert.equal(parseEventDateTime(""), null);
  assert.equal(parseEventDateTime("not-a-date"), null);
});

test("formatEventWhen uses the shared Eastern datetime layer", () => {
  const when = formatEventWhen("2026-10-04T22:00:00.000Z");
  assert.equal(when.label, "Sun, Oct 4, 2026 · 6:00 PM ET");
  assert.equal(when.day, "Oct 4, 2026");
  assert.equal(formatEventWhen("not-a-date").label, "Date TBA");
});
