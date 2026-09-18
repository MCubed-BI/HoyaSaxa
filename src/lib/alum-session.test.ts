import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALUM_SESSION_COOKIE,
  alumSessionCookieName,
  createAlumSessionToken,
  parseAlumSessionToken,
  readAlumSession,
} from "./alum-session";

describe("hoya_alum_session contract", () => {
  it("exports the cookie name Football Program should set", () => {
    assert.equal(ALUM_SESSION_COOKIE, "hoya_alum_session");
    assert.equal(alumSessionCookieName, "hoya_alum_session");
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

  it("rejects a tampered token and an expired session", () => {
    const token = createAlumSessionToken({ role: "board", name: "Lars" });
    assert.equal(parseAlumSessionToken(`${token}x`), null);
    const expired = createAlumSessionToken({
      role: "alum",
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    assert.equal(parseAlumSessionToken(expired), null);
  });
});
