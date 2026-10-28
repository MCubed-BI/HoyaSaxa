import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCentralLoginNext, type CentralLoginSuccess } from "./central-login";

describe("central login next path", () => {
  it("sends admins to staff home by default", () => {
    const result: CentralLoginSuccess = {
      kind: "admin",
      username: "Hoyas",
      session: "env",
      homePath: "/",
    };
    assert.equal(resolveCentralLoginNext(null, result), "/");
    assert.equal(resolveCentralLoginNext("/reports", result), "/reports");
    assert.equal(resolveCentralLoginNext("/login", result), "/");
  });

  it("sends claimed alums without Net ID to /me", () => {
    const result: CentralLoginSuccess = {
      kind: "alum",
      homePath: "/home",
      identity: {
        role: "alum",
        alumniId: "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136",
        email: "alum@example.com",
        name: "Alum",
      },
      account: { id: "acct", email: "alum@example.com", netId: null },
    };
    assert.equal(resolveCentralLoginNext(null, result), "/me");
    assert.equal(resolveCentralLoginNext("/feed", result), "/feed");
  });
});
