import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actorCanEditAthlete, actorCanMergeAthlete, canEditAthletePhotos } from "./athlete-access";
import { canEditAlumniRecord } from "./platform-roles";

describe("athlete edit and merge gates", () => {
  it("uses the platform contract: admin or claimed self", () => {
    assert.equal(canEditAlumniRecord("admin", null, "target"), true);
    assert.equal(canEditAlumniRecord("alum", "target", "target"), true);
    assert.equal(canEditAlumniRecord("board", "target", "target"), true);
    assert.equal(canEditAlumniRecord("alum", "other", "target"), false);
    assert.equal(canEditAlumniRecord("board", null, "target"), false);
  });

  it("lets claimed alum save own photos without ga_session; admin still can", () => {
    assert.equal(
      canEditAthletePhotos({ role: "alum", actorAlumniId: "aaa", targetAlumniId: "aaa" }),
      true,
    );
    assert.equal(
      canEditAthletePhotos({ role: "board", actorAlumniId: "aaa", targetAlumniId: "aaa" }),
      true,
    );
    assert.equal(
      canEditAthletePhotos({ role: "alum", actorAlumniId: "aaa", targetAlumniId: "bbb" }),
      false,
    );
    assert.equal(
      canEditAthletePhotos({ role: "admin", actorAlumniId: null, targetAlumniId: "bbb" }),
      true,
    );
    assert.equal(
      canEditAthletePhotos({ role: "alum", actorAlumniId: null, targetAlumniId: "bbb", claimedSelf: true }),
      true,
    );
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
