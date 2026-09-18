import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALUM_ROLE,
  ALUM_SESSION_COOKIE,
  BOARD_ROLE,
  createAlumSessionToken,
  getAlumSession,
  isAlumLoggedIn,
  readAlumSession,
} from "./alum-session";
import { createSessionToken, isValidSessionToken } from "./auth";
import { isCoachLoggedIn, readSessionInfo } from "./session";

const identity = {
  alumniId: "22222222-2222-4222-8222-222222222222",
  email: "kasten.claim.smoke@example.com",
  name: "Michael Kasten",
};

describe("hoya_alum_session contract", () => {
  it("signs JSON { v:1, role:alum, alumniId, email, name, exp }", () => {
    const token = createAlumSessionToken(identity);
    const [body, signature] = token.split(".");
    assert.ok(body);
    assert.ok(signature);
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    assert.equal(payload.v, 1);
    assert.equal(payload.role, ALUM_ROLE);
    assert.equal(payload.alumniId, identity.alumniId);
    assert.equal(payload.email, identity.email);
    assert.equal(payload.name, identity.name);
    assert.equal(typeof payload.exp, "number");
    assert.equal(payload.exp > Math.floor(Date.now() / 1000), true);
    assert.deepEqual(readAlumSession(token), payload);
  });

  it("defaults Register myself role to alum, not board", () => {
    const token = createAlumSessionToken(identity);
    assert.equal(readAlumSession(token)?.role, "alum");
    assert.notEqual(readAlumSession(token)?.role, BOARD_ROLE);
  });

  it("does not treat an alum token as a coach session", () => {
    const alum = createAlumSessionToken(identity);
    assert.equal(isValidSessionToken(alum), false);
  });

  it("does not treat a coach token as an alum session", () => {
    const coach = createSessionToken();
    assert.equal(readAlumSession(coach), null);
    assert.equal(isValidSessionToken(coach), true);
  });

  it("reports alum from hoya_alum_session for the portal shell", () => {
    const token = createAlumSessionToken(identity);
    const cookies = {
      get(name: string) {
        if (name === ALUM_SESSION_COOKIE) return { value: token };
        return undefined;
      },
    };
    assert.equal(ALUM_SESSION_COOKIE, "hoya_alum_session");
    assert.equal(isAlumLoggedIn(cookies), true);
    assert.equal(isCoachLoggedIn(cookies), false);
    assert.equal(getAlumSession(cookies)?.role, "alum");
    assert.deepEqual(readSessionInfo(cookies), { role: "alum", roles: ["alum"], alum: true, coach: false });
  });

  it("does not treat a board cookie as alum logged in", () => {
    const token = createAlumSessionToken({ ...identity, role: BOARD_ROLE });
    const cookies = {
      get(name: string) {
        if (name === ALUM_SESSION_COOKIE) return { value: token };
        return undefined;
      },
    };
    assert.equal(readAlumSession(token)?.role, "board");
    assert.equal(isAlumLoggedIn(cookies), false);
  });

  it("ignores the legacy ga_alumni_session cookie", () => {
    const token = createAlumSessionToken(identity);
    const cookies = {
      get(name: string) {
        if (name === "ga_alumni_session") return { value: token };
        return undefined;
      },
    };
    assert.equal(isAlumLoggedIn(cookies), false);
    assert.equal(getAlumSession(cookies), null);
  });
});
