import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  givenNameTokens,
  givenNamesEquivalent,
  isLikelyDuplicate,
  lastNamesMatch,
  nicknameRoot,
} from "./alumni-duplicates";

describe("alumni duplicate nicknames", () => {
  it("treats Mike and Michael as the same given name", () => {
    assert.equal(nicknameRoot("Mike"), "michael");
    assert.equal(nicknameRoot("MICHAEL"), "michael");
    assert.equal(
      givenNamesEquivalent(givenNameTokens({ first_name: "Mike" }), givenNameTokens({ first_name: "Michael" })),
      true,
    );
  });

  it("matches Mike Kasten to Michael Kasten even when preferred name is formal", () => {
    const roster = {
      id: "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136",
      first_name: "Michael",
      preferred_name: "Mr. Michael A. Kasten Jr.",
      last_name: "Kasten",
      full_name: "Michael Kasten",
    };
    const linkedin = {
      id: "d88fa54e-e3e2-459e-a989-ff2f739d8c30",
      first_name: "Mike",
      preferred_name: null,
      last_name: "Kasten",
      full_name: "Mike Kasten",
    };
    assert.equal(isLikelyDuplicate(roster, linkedin), true);
    assert.equal(isLikelyDuplicate(linkedin, roster), true);
  });

  it("does not match different first names that share a last name", () => {
    assert.equal(
      isLikelyDuplicate(
        { first_name: "John", last_name: "Kasten" },
        { first_name: "Michael", last_name: "Kasten" },
      ),
      false,
    );
  });

  it("does not match the same first name with a different last name", () => {
    assert.equal(lastNamesMatch("Kasten", "Smith"), false);
    assert.equal(
      isLikelyDuplicate(
        { first_name: "Mike", last_name: "Kasten" },
        { first_name: "Michael", last_name: "Smith" },
      ),
      false,
    );
  });

  it("ignores the same row id", () => {
    assert.equal(
      isLikelyDuplicate(
        { id: "same", first_name: "Mike", last_name: "Kasten" },
        { id: "same", first_name: "Michael", last_name: "Kasten" },
      ),
      false,
    );
  });
});
