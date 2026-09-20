import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actorCanEditAthlete, actorCanMergeAthlete } from "./athlete-access";
import { canEditAlumniRecord } from "./platform-roles";

describe("athlete edit and merge gates", () => {
  it("uses the platform contract: admin or claimed self", () => {
    assert.equal(canEditAlumniRecord("admin", null, "target"), true);
    assert.equal(canEditAlumniRecord("alum", "target", "target"), true);
    assert.equal(canEditAlumniRecord("board", "target", "target"), true);
    assert.equal(canEditAlumniRecord("alum", "other", "target"), false);
    assert.equal(canEditAlumniRecord("board", null, "target"), false);
  });

  it("lets admin or claimed-self edit and merge", () => {
    assert.equal(actorCanEditAthlete({ isAdmin: true, isClaimedSelf: false }), true);
    assert.equal(actorCanEditAthlete({ isAdmin: false, isClaimedSelf: true }), true);
    assert.equal(actorCanEditAthlete({ isAdmin: false, isClaimedSelf: false }), false);
    assert.equal(actorCanMergeAthlete({ isAdmin: true, isClaimedSelf: false }), true);
    assert.equal(actorCanMergeAthlete({ isAdmin: false, isClaimedSelf: true }), true);
    assert.equal(actorCanMergeAthlete({ isAdmin: false, isClaimedSelf: false }), false);
  });
});
