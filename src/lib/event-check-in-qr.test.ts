import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attendancePersonFromCheckInQr,
  createCheckInQrToken,
  parseCheckInQrToken,
} from "./event-check-in-qr";

const eventId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const person = {
  personKey: "alum:11111111-1111-1111-1111-111111111111",
  alumId: "11111111-1111-1111-1111-111111111111",
  userId: "11111111-1111-1111-1111-111111111111",
  displayName: "Pat Hoya",
};

describe("event check-in QR tokens", () => {
  it("round-trips a signed person payload for an event", () => {
    const token = createCheckInQrToken({ eventId, person, nowMs: 1_700_000_000_000 });
    const parsed = parseCheckInQrToken(token, { eventId, nowMs: 1_700_000_000_000 });
    assert.ok(parsed);
    assert.equal(parsed.eventId, eventId);
    assert.equal(parsed.personKey, person.personKey);
    assert.equal(parsed.alumId, person.alumId);
    assert.equal(parsed.displayName, "Pat Hoya");
    assert.deepEqual(attendancePersonFromCheckInQr(parsed), person);
  });

  it("rejects forged, expired, or wrong-event tokens", () => {
    const token = createCheckInQrToken({ eventId, person, nowMs: 1_700_000_000_000, ttlSeconds: 60 });
    assert.equal(parseCheckInQrToken(`${token}x`, { eventId }), null);
    assert.equal(
      parseCheckInQrToken(token, { eventId, nowMs: 1_700_000_000_000 + 120_000 }),
      null,
    );
    assert.equal(
      parseCheckInQrToken(token, {
        eventId: "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
        nowMs: 1_700_000_000_000,
      }),
      null,
    );
  });
});
