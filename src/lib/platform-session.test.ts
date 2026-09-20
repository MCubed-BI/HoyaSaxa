import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALUM_SESSION_COOKIE, createAlumSessionToken } from "./alum-session";
import { SESSION_COOKIE, createSessionToken } from "./auth";
import { FEED_SECTIONS, canPostToFeedSection } from "./feed-sections";
import { createHoyaAlumSessionToken } from "./hoya-alum-session";
import { canPostBoardSection, canPostBrothers } from "./platform-roles";
import { readPlatformRole } from "./platform-session";

function cookieJar(values: Record<string, string>) {
  return {
    get(name: string) {
      return values[name] ? { value: values[name] } : undefined;
    },
  };
}

function composeMatrix(role: NonNullable<ReturnType<typeof readPlatformRole>>) {
  return Object.fromEntries(FEED_SECTIONS.map((section) => [section, canPostToFeedSection(role, section)]));
}

describe("readPlatformRole For You compose", () => {
  it("maps claimed alum / locker alum / board / coach cookies onto the section matrix", () => {
    const claimed = createAlumSessionToken({
      role: "alum",
      alumniId: "11111111-1111-4111-8111-111111111111",
      email: "tim.barnes@example.com",
      name: "Tim Barnes",
    });
    const lockerAlum = createHoyaAlumSessionToken("alum", "Alum");
    const board = createHoyaAlumSessionToken("board", "Board");
    const coach = createSessionToken("Hoyas");

    const claimedRole = readPlatformRole(cookieJar({ [ALUM_SESSION_COOKIE]: claimed }));
    const lockerRole = readPlatformRole(cookieJar({ [ALUM_SESSION_COOKIE]: lockerAlum }));
    const boardRole = readPlatformRole(cookieJar({ [ALUM_SESSION_COOKIE]: board }));
    const adminRole = readPlatformRole(cookieJar({ [SESSION_COOKIE]: coach }));

    assert.equal(claimedRole, "alum");
    assert.equal(lockerRole, "alum");
    assert.equal(boardRole, "board");
    assert.equal(adminRole, "admin");

    assert.deepEqual(composeMatrix(claimedRole!), { brothers: true, board: false, sgarlata: false });
    assert.deepEqual(composeMatrix(lockerRole!), { brothers: true, board: false, sgarlata: false });
    assert.deepEqual(composeMatrix(boardRole!), { brothers: true, board: true, sgarlata: false });
    assert.deepEqual(composeMatrix(adminRole!), { brothers: true, board: true, sgarlata: true });

    assert.equal(canPostBrothers(claimedRole!), true);
    assert.equal(canPostBoardSection(claimedRole!), false);
    assert.equal(canPostBoardSection(boardRole!), true);
    assert.equal(canPostBrothers(adminRole!), true);
  });
});
