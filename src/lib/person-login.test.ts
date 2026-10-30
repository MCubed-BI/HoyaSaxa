import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeNetId, normalizeSupporterUsername } from "./alumni-net-id";

describe("People portal login identifiers", () => {
  it("Alum NetID and Support username share charset rules", () => {
    assert.equal(normalizeNetId("Mak264"), "mak264");
    assert.equal(normalizeSupporterUsername("CoachMike"), "coachmike");
  });

  it("rejects short or spaced identifiers", () => {
    assert.throws(() => normalizeNetId("x"), /letters and numbers|GTown NetID/);
    assert.throws(() => normalizeSupporterUsername("x"), /letters and numbers/);
    assert.throws(() => normalizeSupporterUsername("bad name"), /letters and numbers/);
  });
});
