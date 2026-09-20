import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  SEED_ADMIN_ALUMNI_ID,
  canEditAlumniRecord,
  alumModeCapabilities,
  canCreateProgramEvents,
  canPostBoardSection,
  canPostBrothers,
  canPostSgarlataOrCoachBoard,
  isAdminEmail,
  isSeedAdminIdentity,
  resolvePlatformRole,
} from "./platform-roles";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("platform roles", () => {
  it("treats coach session and owner/coach env roles as admin", () => {
    assert.equal(resolvePlatformRole({ coachSession: true }), "admin");
    assert.equal(resolvePlatformRole({ source: "ga_session", sessionRole: "coach" }), "admin");
    assert.equal(resolvePlatformRole({ sessionRole: "owner" }), "admin");
    assert.equal(resolvePlatformRole({ sessionRole: "coach" }), "admin");
  });

  it("seeds Lars, Sgarlata/Hoyas, and Mike as admin", () => {
    assert.equal(resolvePlatformRole({ sessionRole: "board", username: "Lars" }), "admin");
    assert.equal(resolvePlatformRole({ sessionRole: "board", name: "Lars" }), "admin");
    assert.equal(resolvePlatformRole({ sessionRole: "alum", username: "Hoyas" }), "admin");
    assert.equal(resolvePlatformRole({ sessionRole: "alum", name: "Rob Sgarlata" }), "admin");
    assert.equal(
      resolvePlatformRole({ sessionRole: "alum", alumniId: SEED_ADMIN_ALUMNI_ID, name: "Michael Kasten" }),
      "admin",
    );
    assert.equal(isSeedAdminIdentity({ alumniId: SEED_ADMIN_ALUMNI_ID }), true);
  });

  it("honors ADMIN_EMAILS and staff_roles admin", () => {
    process.env.ADMIN_EMAILS = "board@example.com, mike@nipseytech.com";
    assert.equal(isAdminEmail("Mike@Nipseytech.com"), true);
    assert.equal(resolvePlatformRole({ sessionRole: "alum", email: "board@example.com" }), "admin");
    assert.equal(resolvePlatformRole({ sessionRole: "alum", assignedRole: "admin" }), "admin");
    assert.equal(resolvePlatformRole({ sessionRole: "alum", email: "pat@example.com" }), "alum");
  });

  it("lets HOYA_ADMIN_USERNAMES replace username seeds but keeps Mike alumni id", () => {
    process.env.HOYA_ADMIN_USERNAMES = "Pat";
    assert.equal(resolvePlatformRole({ sessionRole: "board", username: "Lars" }), "board");
    assert.equal(resolvePlatformRole({ sessionRole: "alum", username: "Pat" }), "admin");
    assert.equal(resolvePlatformRole({ sessionRole: "alum", alumniId: SEED_ADMIN_ALUMNI_ID }), "admin");
  });

  it("keeps ordinary board below Sgarlata compose and alum on Brothers only", () => {
    const board = resolvePlatformRole({ sessionRole: "board", username: "PatBoard" });
    const alum = resolvePlatformRole({ sessionRole: "alum", name: "Pat Hoya" });
    assert.equal(board, "board");
    assert.equal(alum, "alum");
    assert.equal(canPostSgarlataOrCoachBoard(board), false);
    assert.equal(canPostSgarlataOrCoachBoard("admin"), true);
    assert.equal(canPostBoardSection(board), true);
    assert.equal(canPostBoardSection(alum), false);
    assert.equal(canPostBrothers(alum), true);
    assert.equal(canEditAlumniRecord("alum", "aaa", "aaa"), true);
    assert.equal(canEditAlumniRecord("alum", "aaa", "bbb"), false);
    assert.equal(canEditAlumniRecord("admin", null, "bbb"), true);
    assert.equal(canCreateProgramEvents("alum"), true);
    assert.equal(canCreateProgramEvents("board"), true);
    assert.equal(canCreateProgramEvents("admin"), true);
    assert.deepEqual(alumModeCapabilities("alum"), {
      canPostBrothers: true,
      canPostBoard: false,
      canPostSgarlata: false,
      canCreateEvents: true,
      canSearchDirectory: true,
      canEditSelf: true,
    });
  });

  it("overlays staff_roles Board grant without minting admin", () => {
    assert.equal(resolvePlatformRole({ sessionRole: "alum", assignedRole: "board", name: "Tim Barnes" }), "board");
    assert.equal(canPostBoardSection(resolvePlatformRole({ sessionRole: "alum", assignedRole: "board" })), true);
    assert.equal(canPostSgarlataOrCoachBoard(resolvePlatformRole({ sessionRole: "alum", assignedRole: "board" })), false);
    assert.equal(resolvePlatformRole({ sessionRole: "alum", assignedRole: "admin" }), "admin");
  });
});
