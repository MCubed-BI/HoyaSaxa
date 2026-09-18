import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashAlumniPassword, isValidEmail, verifyAlumniPassword } from "./alumni-auth";

describe("alumni password helpers", () => {
  it("hashes and verifies a password", () => {
    const stored = hashAlumniPassword("HoyaSaxa15!");
    assert.equal(verifyAlumniPassword("HoyaSaxa15!", stored), true);
    assert.equal(verifyAlumniPassword("wrong-password", stored), false);
  });

  it("accepts a normal email", () => {
    assert.equal(isValidEmail("kasten.claim.smoke@example.com"), true);
    assert.equal(isValidEmail("not-an-email"), false);
  });
});
