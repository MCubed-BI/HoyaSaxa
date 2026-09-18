import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { navItemsForRole } from "./nav";
import { isAlumAllowedPath, isPublicPath, loginPathFor } from "./portal-paths";
import { toPublicAlumniCard } from "./portal-queries";
import {
  canUseBlast,
  homePathForRole,
  resolveRoleFromEnv,
  staffUsernamesFromEnv,
} from "./roles";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("roles", () => {
  it("maps default staff usernames", () => {
    delete process.env.HOYA_OWNER_USERNAMES;
    delete process.env.HOYA_COACH_USERNAMES;
    delete process.env.HOYA_BOARD_USERNAMES;
    delete process.env.HOYA_ALUM_USERNAMES;
    const lists = staffUsernamesFromEnv("Hoyas");
    assert.deepEqual(lists.owner, ["Hoyas"]);
    assert.deepEqual(lists.board, ["Lars"]);
    assert.deepEqual(lists.alum, ["Alum"]);
  });

  it("resolves env roles with owner precedence", () => {
    process.env.HOYA_OWNER_USERNAMES = "Hoyas,Mike";
    process.env.HOYA_BOARD_USERNAMES = "Lars,Mike";
    assert.equal(resolveRoleFromEnv("Hoyas", "Hoyas"), "owner");
    assert.equal(resolveRoleFromEnv("Lars", "Hoyas"), "board");
    assert.equal(resolveRoleFromEnv("Mike", "Hoyas"), "owner");
    assert.equal(resolveRoleFromEnv("Alum", "Hoyas"), "alum");
  });

  it("hides blast for alum and board", () => {
    assert.equal(canUseBlast("owner"), true);
    assert.equal(canUseBlast("coach"), true);
    assert.equal(canUseBlast("board"), false);
    assert.equal(canUseBlast("alum"), false);
    assert.equal(
      navItemsForRole("alum").some((item) => item.key === "blast"),
      false,
    );
    assert.deepEqual(
      navItemsForRole("alum").map((item) => item.href),
      ["/home", "/directory", "/portal/events", "/portal/giving", "/messages"],
    );
    assert.equal(homePathForRole("alum"), "/portal");
    assert.equal(homePathForRole("board"), "/portal");
    assert.equal(homePathForRole("owner"), "/");
  });
});

describe("portal paths", () => {
  it("keeps claim login public and alum routes allowlisted", () => {
    assert.equal(isPublicPath("/alumni-login"), true);
    assert.equal(isPublicPath("/register"), true);
    assert.equal(isPublicPath("/api/alumni/login"), true);
    assert.equal(isPublicPath("/api/session"), true);
    assert.equal(isAlumAllowedPath("/alum"), true);
    assert.equal(isAlumAllowedPath("/portal"), true);
    assert.equal(isAlumAllowedPath("/portal/directory"), true);
    assert.equal(isPublicPath("/directory"), true);
    assert.equal(isPublicPath("/athletes/demo"), true);
    assert.equal(isAlumAllowedPath("/home"), true);
    assert.equal(isAlumAllowedPath("/feed"), true);
    assert.equal(isAlumAllowedPath("/messages"), true);
    assert.equal(isAlumAllowedPath("/message"), true);
    assert.equal(isAlumAllowedPath("/api/portal/newsflash"), true);
    assert.equal(isAlumAllowedPath("/blast"), false);
    assert.equal(isPublicPath("/home/login"), true);
    assert.equal(loginPathFor("/portal"), "/alumni-login");
    assert.equal(loginPathFor("/home"), "/home/login");
    assert.equal(loginPathFor("/messages"), "/locker");
    assert.equal(loginPathFor("/alum"), "/alumni-login");
    assert.equal(loginPathFor("/reports"), "/login");
  });
});

describe("public alum cards", () => {
  it("strips contact fields", () => {
    const card = toPublicAlumniCard({
      id: "1",
      first_name: "Pat",
      last_name: "Hoya",
      preferred_name: null,
      full_name: null,
      position: "QB",
      seasons: "2015",
      class_year: "2015",
      hometown_city: "D.C.",
      hometown_state: "DC",
      current_city: "Arlington",
      current_state: "VA",
      company_name: "Hoyas",
      job_title: "Coach",
      industry: null,
      linkedin_url: "https://linkedin.com/in/hoya",
      headline: null,
      email_primary: "pat@example.com",
      phone_primary: "2025550100",
      address_primary: "37th & O",
    });
    assert.equal(card.email_primary, null);
    assert.equal(card.phone_primary, null);
    assert.equal(card.address_primary, null);
    assert.equal(card.last_name, "Hoya");
  });
});
