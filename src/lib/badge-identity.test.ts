import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SEED_ADMIN_ALUMNI_ID } from "./platform-roles";
import {
  addCentsByKey,
  donorCohortKey,
  parsePersonName,
  resolveAlumniIdFromLabel,
  resolveAttendanceAlumId,
  seedAlumniIdForLabel,
  unmatchedDonorKey,
} from "./badge-identity";

const kastens = [
  {
    id: SEED_ADMIN_ALUMNI_ID,
    first_name: "Michael",
    last_name: "Kasten",
    preferred_name: "Mike",
    full_name: "Michael Kasten",
  },
  {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeffff0001",
    first_name: "Pat",
    last_name: "Hoya",
    preferred_name: null,
    full_name: "Pat Hoya",
  },
];

describe("badge identity resolve", () => {
  it("maps seed Mike / Michael Kasten labels to the claimed roster id", () => {
    assert.equal(seedAlumniIdForLabel("Mike"), SEED_ADMIN_ALUMNI_ID);
    assert.equal(seedAlumniIdForLabel("Michael Kasten"), SEED_ADMIN_ALUMNI_ID);
    assert.equal(resolveAlumniIdFromLabel("Mike", []), SEED_ADMIN_ALUMNI_ID);
    assert.equal(resolveAlumniIdFromLabel("Mike Kasten", kastens), SEED_ADMIN_ALUMNI_ID);
    assert.equal(resolveAlumniIdFromLabel("Kasten, Michael", kastens), SEED_ADMIN_ALUMNI_ID);
  });

  it("does not invent a match for anonymous or ambiguous labels", () => {
    assert.equal(resolveAlumniIdFromLabel("Anonymous", kastens), "");
    assert.equal(resolveAlumniIdFromLabel("Hoya", kastens), "");
    assert.equal(parsePersonName("Anonymous").full_name, undefined);
    assert.equal(unmatchedDonorKey("Anonymous"), "label:anonymous");
    assert.equal(unmatchedDonorKey(""), "label:anonymous");
    assert.equal(unmatchedDonorKey("Form Post"), "label:form post");
    assert.equal(donorCohortKey("Mike", kastens), SEED_ADMIN_ALUMNI_ID);
    assert.equal(donorCohortKey("CI Verify", kastens), "label:ci verify");
    const totals = new Map<string, number>();
    addCentsByKey(totals, "", 5000);
    addCentsByKey(totals, donorCohortKey("Form Post", []), 10000);
    addCentsByKey(totals, donorCohortKey("Anonymous", []), 7500);
    assert.equal(totals.get("label:form post"), 10000);
    assert.equal(totals.get("label:anonymous"), 7500);
    assert.equal(totals.size, 2);
  });

  it("resolves attendance rows with null alumId from displayName / personKey", () => {
    assert.equal(
      resolveAttendanceAlumId({ alumId: null, displayName: "Mike", personKey: "user:mike" }, kastens),
      SEED_ADMIN_ALUMNI_ID,
    );
    assert.equal(
      resolveAttendanceAlumId(
        { alumId: null, personKey: `alum:${SEED_ADMIN_ALUMNI_ID}`, userId: SEED_ADMIN_ALUMNI_ID },
        [],
      ),
      SEED_ADMIN_ALUMNI_ID,
    );
    assert.equal(resolveAttendanceAlumId({ alumId: null, displayName: "Guest" }, kastens), "");
  });
});
