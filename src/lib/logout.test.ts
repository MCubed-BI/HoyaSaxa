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
  it("sends locker chrome back to /home/login even if a leftover ga_session cookie exists", () => {
    assert.equal(
      logoutRedirectPath({
        from: "/newsflash",
        hadStaffCookie: true,
        hadAlumCookie: true,
      }),
      "/home/login",
    );
    assert.equal(logoutRedirectPath({ from: "/home", hadAlumCookie: true }), "/home/login");
    assert.equal(logoutRedirectPath({ from: "/feed", hadAlumCookie: true }), "/home/login");
    assert.equal(logoutRedirectPath({ from: "/directory", hadAlumCookie: true }), "/home/login");
  });

  it("uses the referer when the form does not send from", () => {
    assert.equal(
      logoutRedirectPath({
        refererPath: "/newsflash",
        hadStaffCookie: true,
      }),
      "/home/login",
    );
    assert.equal(logoutRedirectPath({ refererPath: "/messages/sgarlata" }), "/locker");
    assert.equal(logoutRedirectPath({ from: "/me" }), "/alumni-login");
    assert.equal(logoutRedirectPath({ from: "/", hadStaffCookie: true }), "/login");
  });

  it("falls back to locker login when only an alum cookie is present", () => {
    assert.equal(logoutRedirectPath({ hadAlumCookie: true }), "/home/login");
    assert.equal(logoutRedirectPath({ hadStaffCookie: true }), "/login");
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
