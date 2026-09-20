import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { navItemsForRole, portalMoreItems } from "./nav";
import { isAlumAllowedPath, isPublicPath, isStaffAlumniMutationPath, loginPathFor } from "./portal-paths";
import { toPublicAlumniCard } from "./portal-queries";
import { allowRequest, isCoachComposePath } from "./access";
import {
  accessModeForRole,
  canPostBrothers,
  canPostCoachMessage,
  canPostNewsflash,
  canUseAlumEmailBlast,
  canUseBlast,
  DEFAULT_ADMIN_USERNAMES,
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
    delete process.env.HOYA_ADMIN_USERNAMES;
    delete process.env.HOYA_OWNER_USERNAMES;
    delete process.env.HOYA_COACH_USERNAMES;
    delete process.env.HOYA_BOARD_USERNAMES;
    delete process.env.HOYA_ALUM_USERNAMES;
    const lists = staffUsernamesFromEnv("Hoyas");
    assert.deepEqual(lists.owner, ["Hoyas", ...DEFAULT_ADMIN_USERNAMES]);
    assert.deepEqual(lists.board, ["Board"]);
    assert.deepEqual(lists.alum, ["Alum"]);
  });

  it("resolves seeded admins and keeps a distinct Board preview", () => {
    delete process.env.HOYA_ADMIN_USERNAMES;
    delete process.env.HOYA_OWNER_USERNAMES;
    process.env.HOYA_BOARD_USERNAMES = "Board";
    assert.equal(resolveRoleFromEnv("Hoyas", "Hoyas"), "owner");
    assert.equal(resolveRoleFromEnv("Lars", "Hoyas"), "owner");
    assert.equal(resolveRoleFromEnv("Sgarlata", "Hoyas"), "owner");
    assert.equal(resolveRoleFromEnv("Mike", "Hoyas"), "owner");
    assert.equal(resolveRoleFromEnv("Michael Kasten", "Hoyas"), "owner");
    assert.equal(resolveRoleFromEnv("Board", "Hoyas"), "board");
    assert.equal(resolveRoleFromEnv("Alum", "Hoyas"), "alum");
  });

  it("lets HOYA_ADMIN_USERNAMES replace the seed list", () => {
    process.env.HOYA_ADMIN_USERNAMES = "Pat";
    delete process.env.HOYA_OWNER_USERNAMES;
    process.env.HOYA_BOARD_USERNAMES = "Lars";
    assert.equal(resolveRoleFromEnv("Pat", "Hoyas"), "owner");
    assert.equal(resolveRoleFromEnv("Lars", "Hoyas"), "board");
    assert.equal(resolveRoleFromEnv("Hoyas", "Hoyas"), "owner");
    process.env.HOYA_ADMIN_USERNAMES = "";
    assert.equal(resolveRoleFromEnv("Lars", "Hoyas"), "owner");
  });

  it("maps product modes and compose rights", () => {
    assert.equal(accessModeForRole("owner"), "admin");
    assert.equal(accessModeForRole("coach"), "admin");
    assert.equal(accessModeForRole("board"), "board");
    assert.equal(accessModeForRole("alum"), "alum");
    assert.equal(canPostCoachMessage("owner"), true);
    assert.equal(canPostCoachMessage("coach"), true);
    assert.equal(canPostCoachMessage("board"), false);
    assert.equal(canPostCoachMessage("alum"), false);
    assert.equal(canPostNewsflash("owner"), true);
    assert.equal(canPostNewsflash("coach"), true);
    assert.equal(canPostNewsflash("board"), true);
    assert.equal(canPostNewsflash("alum"), false);
    assert.equal(canPostBrothers("alum"), true);
    assert.equal(canPostBrothers("board"), true);
    assert.equal(isCoachComposePath("/api/messages/channels/sgarlata/posts"), true);
    assert.equal(isCoachComposePath("/api/portal/coach-messages"), true);
    assert.equal(
      allowRequest({ role: "board", mode: "board", source: "alum-session", label: "Board", alumniId: null, verifiedHoya: false }, "/api/messages/channels/sgarlata/posts", "POST"),
      false,
    );
    assert.equal(
      allowRequest({ role: "owner", mode: "admin", source: "staff", label: "Lars", alumniId: null, verifiedHoya: false }, "/api/messages/channels/sgarlata/posts", "POST"),
      true,
    );
    assert.equal(
      allowRequest(
        {
          role: "alum",
          mode: "admin",
          source: "alum-session",
          label: "Mike",
          alumniId: "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136",
          verifiedHoya: true,
        },
        "/api/messages/channels/sgarlata/posts",
        "POST",
      ),
      true,
    );
    assert.equal(
      allowRequest({ role: "board", mode: "board", source: "alum-session", label: "Board", alumniId: null, verifiedHoya: false }, "/messages/sgarlata", "GET"),
      true,
    );
  });

  it("hides staff blast for alum and board and offers selected email instead", () => {
    assert.equal(canUseBlast("owner"), true);
    assert.equal(canUseBlast("coach"), true);
    assert.equal(canUseBlast("board"), false);
    assert.equal(canUseBlast("alum"), false);
    assert.equal(canUseAlumEmailBlast("alum"), true);
    assert.equal(canUseAlumEmailBlast("board"), true);
    assert.equal(
      navItemsForRole("alum").some((item) => item.key === "blast"),
      false,
    );
    assert.equal(
      portalMoreItems("alum").some((item) => item.href === "/portal/blast"),
      true,
    );
    assert.deepEqual(
      navItemsForRole("alum").map((item) => item.href),
      ["/home", "/directory", "/events", "/giving", "/messages"],
    );
    assert.equal(
      navItemsForRole("owner").some((item) => item.href === "/find-my-alum"),
      true,
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
    assert.equal(isStaffAlumniMutationPath("/api/alumni/update"), false);
    assert.equal(isStaffAlumniMutationPath("/api/alumni/merge"), true);
    assert.equal(isStaffAlumniMutationPath("/api/alumni/register"), false);
    assert.equal(isStaffAlumniMutationPath("/api/alumni/lookup"), false);
    assert.equal(isPublicPath("/api/session"), true);
    assert.equal(isAlumAllowedPath("/alum"), true);
    assert.equal(isAlumAllowedPath("/portal"), true);
    assert.equal(isAlumAllowedPath("/portal/directory"), true);
    assert.equal(isAlumAllowedPath("/directory"), true);
    assert.equal(isPublicPath("/directory"), false);
    assert.equal(isPublicPath("/athletes/demo"), false);
    assert.equal(isAlumAllowedPath("/api/blast"), true);
    assert.equal(loginPathFor("/directory"), "/login");
    assert.equal(isAlumAllowedPath("/home"), true);
    assert.equal(isAlumAllowedPath("/feed"), true);
    assert.equal(isAlumAllowedPath("/messages"), true);
    assert.equal(isAlumAllowedPath("/find-my-alum"), true);
    assert.equal(isAlumAllowedPath("/message"), true);
    assert.equal(isAlumAllowedPath("/api/portal/newsflash"), true);
    assert.equal(isAlumAllowedPath("/api/locker/feed"), true);
    assert.equal(isAlumAllowedPath("/board"), true);
    assert.equal(isAlumAllowedPath("/api/feed"), true);
    assert.equal(isAlumAllowedPath("/api/badges"), true);
    assert.equal(loginPathFor("/board"), "/home/login");
    assert.equal(isAlumAllowedPath("/events"), true);
    assert.equal(isAlumAllowedPath("/events/check-in"), true);
    assert.equal(isAlumAllowedPath("/api/events/attendance/feed"), true);
    assert.equal(isAlumAllowedPath("/sync"), false);
    assert.equal(isAlumAllowedPath("/blast"), false);
    assert.equal(isPublicPath("/home/login"), true);
    assert.equal(isPublicPath("/manifest.webmanifest"), true);
    assert.equal(isPublicPath("/api/logout"), true);
    assert.equal(isPublicPath("/api/locker/logout"), true);
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
