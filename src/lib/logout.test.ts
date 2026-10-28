import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cookieHeaderHas,
  hasAlumSessionCookieHeader,
  hasStaffSessionCookie,
  logoutRedirectPath,
  refererPathFromHeader,
  safeLogoutFromPath,
} from "./logout";

describe("logout destinations", () => {
  it("sends most surfaces back to central /login", () => {
    assert.equal(
      logoutRedirectPath({
        from: "/newsflash",
        hadStaffCookie: true,
        hadAlumCookie: true,
      }),
      "/login",
    );
    assert.equal(logoutRedirectPath({ from: "/home", hadAlumCookie: true }), "/login");
    assert.equal(logoutRedirectPath({ from: "/feed", hadAlumCookie: true }), "/login");
    assert.equal(logoutRedirectPath({ from: "/directory", hadAlumCookie: true }), "/login");
    assert.equal(logoutRedirectPath({ from: "/me" }), "/login");
    assert.equal(logoutRedirectPath({ from: "/", hadStaffCookie: true }), "/login");
    assert.equal(logoutRedirectPath({ hadAlumCookie: true }), "/login");
    assert.equal(logoutRedirectPath({ hadStaffCookie: true }), "/login");
  });

  it("keeps messages on the access-code gate", () => {
    assert.equal(logoutRedirectPath({ refererPath: "/messages/sgarlata" }), "/locker");
  });
});

describe("logout cookie helpers", () => {
  it("does not treat ga_alumni_session as ga_session", () => {
    const header = "ga_alumni_session=abc; hoya_alum_session=xyz";
    assert.equal(hasStaffSessionCookie(header), false);
    assert.equal(hasAlumSessionCookieHeader(header), true);
    assert.equal(cookieHeaderHas(header, "ga_session"), false);
    assert.equal(cookieHeaderHas("ga_session=token", "ga_session"), true);
  });

  it("reads a same-origin referer path", () => {
    assert.equal(
      refererPathFromHeader("http://127.0.0.1:43173/newsflash", "http://127.0.0.1:43173/api/logout"),
      "/newsflash",
    );
    assert.equal(
      refererPathFromHeader("https://evil.example/newsflash", "http://127.0.0.1:43173/api/logout"),
      null,
    );
    assert.equal(safeLogoutFromPath("//evil.example"), null);
    assert.equal(safeLogoutFromPath("/newsflash?x=1"), "/newsflash");
  });
});
