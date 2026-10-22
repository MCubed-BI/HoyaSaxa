import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePersonKind, parsePersonKinds, personKindLabel } from "./person-kind";

test("normalizePersonKind maps player/support aliases", () => {
  assert.equal(normalizePersonKind("Player"), "alum");
  assert.equal(normalizePersonKind("alum"), "alum");
  assert.equal(normalizePersonKind("Support"), "supporter");
  assert.equal(normalizePersonKind("supporter"), "supporter");
  assert.equal(personKindLabel("supporter"), "Support");
  assert.deepEqual(parsePersonKinds(["support", "alum", "alum"]), ["supporter", "alum"]);
});
