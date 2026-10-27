import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertDevelopmentPassword,
  normalizeDevelopmentUsername,
  normalizePersonKind,
  parsePersonKinds,
  personKindLabel,
} from "./person-kind";

test("normalizePersonKind maps player/support/development aliases", () => {
  assert.equal(normalizePersonKind("Player"), "alum");
  assert.equal(normalizePersonKind("alum"), "alum");
  assert.equal(normalizePersonKind("Support"), "supporter");
  assert.equal(normalizePersonKind("supporter"), "supporter");
  assert.equal(normalizePersonKind("Development"), "development");
  assert.equal(normalizePersonKind("dev"), "development");
  assert.equal(personKindLabel("supporter"), "Support");
  assert.equal(personKindLabel("development"), "Development");
  assert.deepEqual(parsePersonKinds(["support", "alum", "alum", "dev"]), [
    "supporter",
    "alum",
    "development",
  ]);
});

test("Development username and password validation", () => {
  assert.equal(normalizeDevelopmentUsername(" Dev.Admin_1 "), "Dev.Admin_1");
  assert.throws(() => normalizeDevelopmentUsername(""), /Username is required/);
  assert.throws(() => normalizeDevelopmentUsername("bad name"), /letters, numbers/);
  assert.equal(assertDevelopmentPassword("password1"), "password1");
  assert.throws(() => assertDevelopmentPassword("short"), /at least 8/);
});
