import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toE164 } from "./phone";

describe("toE164", () => {
  it("normalizes US 10-digit and 11-digit numbers", () => {
    assert.equal(toE164("(202) 555-0100"), "+12025550100");
    assert.equal(toE164("2025550100"), "+12025550100");
    assert.equal(toE164("1-202-555-0100"), "+12025550100");
    assert.equal(toE164("+12025550100"), "+12025550100");
  });

  it("rejects short or empty values", () => {
    assert.equal(toE164("555-0100"), null);
    assert.equal(toE164(""), null);
    assert.equal(toE164("abc"), null);
  });
});
