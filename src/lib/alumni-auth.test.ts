import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALUM_ROLE, createAlumniSessionToken, isValidAlumniSessionToken, readAlumniSessionAccountId } from "./alumni-auth";
import { createSessionToken, isValidSessionToken } from "./auth";
import { readSessionInfo } from "./session";

describe("alum vs coach sessions", () => {
  it("tags new alumni tokens with role alum", () => {
    const token = createAlumniSessionToken("11111111-1111-4111-8111-111111111111");
    assert.equal(token.startsWith(`${ALUM_ROLE}.`), true);
    assert.equal(readAlumniSessionAccountId(token), "11111111-1111-4111-8111-111111111111");
    assert.equal(isValidAlumniSessionToken(token), true);
  });

  it("does not treat an alum token as a coach session", () => {
    const alum = createAlumniSessionToken("11111111-1111-4111-8111-111111111111");
    assert.equal(isValidSessionToken(alum), false);
  });

  it("does not treat a coach token as an alum session", () => {
    const coach = createSessionToken();
    assert.equal(isValidAlumniSessionToken(coach), false);
    assert.equal(isValidSessionToken(coach), true);
  });

  it("reports alum from the alumni cookie for a future portal shell", () => {
    const token = createAlumniSessionToken("11111111-1111-4111-8111-111111111111");
    const cookies = {
      get(name: string) {
        if (name === "ga_alumni_session") return { value: token };
        return undefined;
      },
    };
    const info = readSessionInfo(cookies);
    assert.deepEqual(info, { role: "alum", roles: ["alum"], alum: true, coach: false });
  });
});
