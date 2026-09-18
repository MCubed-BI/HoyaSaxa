import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALUMNI_SESSION_COOKIE,
  ALUM_SESSION_COOKIE,
  alumSessionCookieName,
  createAlumSessionToken,
  isAlumLoggedIn,
  parseAlumSessionToken,
  readAlumSession,
  setAlumSessionCookies,
  writeAlumSessionCookie,
} from "./alum-session";
import { createSessionToken, isValidSessionToken } from "./auth";
import { isCoachLoggedIn, readSessionInfo } from "./session";

describe("hoya_alum_session contract", () => {
  it("exports the cookie name Football Program should set", () => {
    assert.equal(ALUM_SESSION_COOKIE, "hoya_alum_session");
    assert.equal(alumSessionCookieName, "hoya_alum_session");
    assert.equal(ALUMNI_SESSION_COOKIE, "hoya_alum_session");
  });

  it("round-trips a signed alum session", () => {
    const token = createAlumSessionToken({
      role: "alum",
      alumniId: "11111111-1111-1111-1111-111111111111",
      email: "pat@example.com",
      name: "Pat Hoya",
    });
    const session = parseAlumSessionToken(token);
    assert.equal(session?.v, 1);
    assert.equal(session?.role, "alum");
    assert.equal(session?.alumniId, "11111111-1111-1111-1111-111111111111");
    assert.equal(session?.email, "pat@example.com");
    assert.equal(readAlumSession(token)?.name, "Pat Hoya");
  });

  it("setAlumSessionCookies writes hoya_alum_session for claim login", () => {
    const jar = new Map<string, string>();
    setAlumSessionCookies(
      {
        cookies: {
          set(name, value) {
            jar.set(name, value);
          },
        },
      },
      {
        role: "alum",
        alumniId: "22222222-2222-2222-2222-222222222222",
        email: "claim@example.com",
        name: "Claimed Hoya",
      },
    );
    const token = jar.get("hoya_alum_session");
    assert.ok(token);
    assert.equal(parseAlumSessionToken(token)?.email, "claim@example.com");
    assert.equal(jar.has("ga_alumni_session"), false);
  });

  it("rejects a tampered token and an expired session", () => {
    const token = createAlumSessionToken({ role: "board", name: "Lars" });
    assert.equal(parseAlumSessionToken(`${token}x`), null);
    const expired = createAlumSessionToken({
      role: "alum",
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    assert.equal(parseAlumSessionToken(expired), null);
  });

  it("isAlumLoggedIn is true only for a verified alum-role contract cookie", () => {
    const jar = new Map<string, { value: string }>();
    writeAlumSessionCookie(
      {
        cookies: {
          set(name, value) {
            jar.set(name, { value });
          },
        },
      },
      { role: "alum", alumniId: "33333333-3333-3333-3333-333333333333", email: "a@hoya.edu", name: "A" },
    );
    assert.equal(isAlumLoggedIn({ get: (name) => jar.get(name) }), true);

    const boardJar = new Map<string, { value: string }>();
    writeAlumSessionCookie(
      {
        cookies: {
          set(name, value) {
            boardJar.set(name, { value });
          },
        },
      },
      { role: "board", alumniId: "44444444-4444-4444-4444-444444444444", email: "lars@hoya.edu", name: "Lars" },
    );
    assert.equal(isAlumLoggedIn({ get: (name) => boardJar.get(name) }), false);
  });

  it("does not treat an alum token as a coach session", () => {
    const alum = createAlumSessionToken({
      role: "alum",
      alumniId: "11111111-1111-1111-1111-111111111111",
      email: "pat@example.com",
      name: "Pat Hoya",
    });
    assert.equal(isValidSessionToken(alum), false);
  });

  it("does not treat a coach token as an alum session", () => {
    const coach = createSessionToken();
    assert.equal(parseAlumSessionToken(coach), null);
    assert.equal(isValidSessionToken(coach), true);
  });

  it("reports alum from hoya_alum_session for the portal shell", () => {
    const token = createAlumSessionToken({
      role: "alum",
      alumniId: "22222222-2222-4222-8222-222222222222",
      email: "kasten.claim.smoke@example.com",
      name: "Michael Kasten",
    });
    const cookies = {
      get(name: string) {
        if (name === ALUM_SESSION_COOKIE) return { value: token };
        return undefined;
      },
    };
    assert.equal(isAlumLoggedIn(cookies), true);
    assert.equal(isCoachLoggedIn(cookies), false);
    assert.deepEqual(readSessionInfo(cookies), { role: "alum", roles: ["alum"], alum: true, coach: false });
  });

  it("ignores the legacy ga_alumni_session cookie", () => {
    const token = createAlumSessionToken({ role: "alum", email: "pat@example.com", name: "Pat" });
    const cookies = {
      get(name: string) {
        if (name === "ga_alumni_session") return { value: token };
        return undefined;
      },
    };
    assert.equal(isAlumLoggedIn(cookies), false);
  });
});
