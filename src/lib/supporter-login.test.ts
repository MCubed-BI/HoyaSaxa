import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSupporterUsername } from "./alumni-net-id";

test("normalizeSupporterUsername accepts letters and digits", () => {
  assert.equal(normalizeSupporterUsername("MikeGold"), "mikegold");
  assert.equal(normalizeSupporterUsername("supporter1"), "supporter1");
});

test("normalizeSupporterUsername rejects invalid usernames", () => {
  assert.throws(() => normalizeSupporterUsername("a"), /letters and numbers/);
  assert.throws(() => normalizeSupporterUsername("bad name"), /letters and numbers/);
  assert.throws(() => normalizeSupporterUsername("has@sign"), /letters and numbers/);
});
