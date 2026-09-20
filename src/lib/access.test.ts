import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isVerifiedHoyaIdentity, resolveCookieAccess } from "./access";
import { ALUM_SESSION_COOKIE, PREVIEW_ALUMNI_ID, createAlumSessionToken } from "./alum-session";
import { createHoyaAlumSessionToken } from "./hoya-alum-session";

describe("Verified Hoya session contract", () => {
  it("grants Verified Hoya on preview Alum and real claim, not Board", () => {
    assert.equal(isVerifiedHoyaIdentity({ role: "alum" }), true);
    assert.equal(isVerifiedHoyaIdentity({ role: "alum", alumniId: PREVIEW_ALUMNI_ID }), true);
    assert.equal(
      isVerifiedHoyaIdentity({
        role: "alum",
        alumniId: "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136",
      }),
      true,
    );
    assert.equal(
      isVerifiedHoyaIdentity({ alumniId: "11111111-1111-4111-8111-111111111111" }),
      true,
    );
    assert.equal(isVerifiedHoyaIdentity({ role: "board" }), false);
    assert.equal(isVerifiedHoyaIdentity({ role: "board", alumniId: PREVIEW_ALUMNI_ID }), false);
    assert.equal(isVerifiedHoyaIdentity({ role: "owner" }), false);
    assert.equal(isVerifiedHoyaIdentity({ alumniId: PREVIEW_ALUMNI_ID }), false);
    assert.equal(isVerifiedHoyaIdentity({ alumniId: "" }), false);
  });

  it("marks preview Alum cookies verified and Board cookies not", () => {
    const preview = createAlumSessionToken({ role: "alum", name: "Alum" });
    const claimed = createAlumSessionToken({
      role: "alum",
      alumniId: "11111111-1111-4111-8111-111111111111",
      email: "pat@example.com",
      name: "Pat Hoya",
    });
    const board = createAlumSessionToken({ role: "board", name: "Board" });
    const lockerAlum = createHoyaAlumSessionToken("alum", "Alum");
    const lockerBoard = createHoyaAlumSessionToken("board", "Board");

    assert.equal(
      resolveCookieAccess({
        get: (name) => (name === ALUM_SESSION_COOKIE ? { value: preview } : undefined),
      })?.verifiedHoya,
      true,
    );
    assert.equal(
      resolveCookieAccess({
        get: (name) => (name === ALUM_SESSION_COOKIE ? { value: claimed } : undefined),
      })?.verifiedHoya,
      true,
    );
    assert.equal(
      resolveCookieAccess({
        get: (name) => (name === ALUM_SESSION_COOKIE ? { value: board } : undefined),
      })?.verifiedHoya,
      false,
    );
    assert.equal(
      resolveCookieAccess({
        get: (name) => (name === ALUM_SESSION_COOKIE ? { value: lockerAlum } : undefined),
      })?.verifiedHoya,
      true,
    );
    assert.equal(
      resolveCookieAccess({
        get: (name) => (name === ALUM_SESSION_COOKIE ? { value: lockerBoard } : undefined),
      })?.verifiedHoya,
      false,
    );
  });
});
