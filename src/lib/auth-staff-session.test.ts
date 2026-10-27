import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDbStaffSessionToken,
  createSessionToken,
  isDbStaffSessionToken,
  readSessionUsername,
} from "./auth";

test("env staff session tokens still round-trip for allowlisted usernames", () => {
  const token = createSessionToken("Hoyas");
  assert.equal(readSessionUsername(token), "Hoyas");
  assert.equal(isDbStaffSessionToken(token), false);
});

test("DB Development staff session tokens validate without env allowlist", () => {
  const token = createDbStaffSessionToken("Dev.Admin");
  assert.equal(readSessionUsername(token), "Dev.Admin");
  assert.equal(isDbStaffSessionToken(token), true);
  assert.equal(readSessionUsername("Dev.Admin.123.not-a-real-sig"), null);
});
