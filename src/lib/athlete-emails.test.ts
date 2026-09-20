import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectAthleteEmails, normalizeAthleteEmail } from "./athlete-emails";

describe("athlete profile emails", () => {
  it("keeps primary first and dedupes alumni_emails", () => {
    assert.deepEqual(
      collectAthleteEmails("mbuckman961@gmail.com", [
        { email: "mbuckman961@gmail.com" },
        { email: "buckman961@aol.com" },
        { email: "mjb365@georgetown.edu" },
      ]),
      ["mbuckman961@gmail.com", "buckman961@aol.com", "mjb365@georgetown.edu"],
    );
    assert.deepEqual(collectAthleteEmails("mak264@georgetown.edu", [{ email: "mak264@georgetown.edu" }]), [
      "mak264@georgetown.edu",
    ]);
  });

  it("drops empty or invalid cells", () => {
    assert.equal(normalizeAthleteEmail("  "), null);
    assert.equal(normalizeAthleteEmail("not-an-email"), null);
    assert.deepEqual(collectAthleteEmails(null, [{ email: "" }, ""]), []);
  });
});
