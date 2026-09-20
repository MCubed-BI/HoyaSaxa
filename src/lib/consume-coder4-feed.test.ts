import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coder4AttendanceFeedAvailable,
  tryCoder4AlumAttendanceTotals,
  tryCoder4AttendanceLeaders,
} from "./consume-coder4-feed";

describe("Coder 4 feed consume", () => {
  it("does not import a missing event-attendance-feed module", async () => {
    assert.equal(coder4AttendanceFeedAvailable(), false);
    assert.equal(await tryCoder4AlumAttendanceTotals("a"), undefined);
    assert.equal(await tryCoder4AttendanceLeaders(), undefined);
  });
});
