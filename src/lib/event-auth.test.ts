import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { SEED_ADMIN_ALUMNI_ID } from "@/lib/platform-roles";
import {
  canCreateEvents,
  canOverrideEventCheckIn,
  parseUsernameList,
  platformRoleForEventActor,
  resolveEventRole,
} from "@/lib/event-auth";

const originalBoard = process.env.HOYA_BOARD_USERNAMES;
const originalAlum = process.env.HOYA_ALUM_USERNAMES;
const originalAdmin = process.env.HOYA_ADMIN_USERNAMES;

afterEach(() => {
  if (originalBoard === undefined) delete process.env.HOYA_BOARD_USERNAMES;
  else process.env.HOYA_BOARD_USERNAMES = originalBoard;
  if (originalAlum === undefined) delete process.env.HOYA_ALUM_USERNAMES;
  else process.env.HOYA_ALUM_USERNAMES = originalAlum;
  if (originalAdmin === undefined) delete process.env.HOYA_ADMIN_USERNAMES;
  else process.env.HOYA_ADMIN_USERNAMES = originalAdmin;
});

test("parseUsernameList splits and de-dupes", () => {
  assert.deepEqual(parseUsernameList("Lars, board,Lars"), ["Lars", "board"]);
  assert.deepEqual(parseUsernameList("  "), []);
});

test("Create Event is allowed for admin, board, and alum via Coder 5 helpers", () => {
  assert.equal(canCreateEvents("coach"), true);
  assert.equal(canCreateEvents("admin"), true);
  assert.equal(canCreateEvents("board"), true);
  assert.equal(canCreateEvents("alum"), true);
  assert.equal(canCreateEvents({ role: "alum", username: "Pat Hoya" }), true);
  assert.equal(canCreateEvents({ role: "alum", platformRole: "alum" }), true);
  assert.equal(canCreateEvents(null), false);
  assert.equal(canOverrideEventCheckIn("coach"), true);
  assert.equal(canOverrideEventCheckIn("board"), true);
  assert.equal(canOverrideEventCheckIn("alum"), false);
});

test("shared staff login (Hoyas) resolves to coach and can create", () => {
  delete process.env.HOYA_BOARD_USERNAMES;
  delete process.env.HOYA_ALUM_USERNAMES;
  assert.equal(resolveEventRole("Hoyas", "Hoyas"), "coach");
  assert.equal(canCreateEvents(resolveEventRole("Hoyas", "Hoyas")), true);
  assert.equal(platformRoleForEventActor({ role: "coach", username: "Hoyas", coachSession: true }), "admin");
});

test("HOYA_BOARD_USERNAMES maps to board and can create", () => {
  process.env.HOYA_BOARD_USERNAMES = "Lars";
  assert.equal(resolveEventRole("lars", "Hoyas"), "board");
  assert.equal(canCreateEvents("board"), true);
});

test("HOYA_ALUM_USERNAMES maps to alum and can create events", () => {
  process.env.HOYA_ALUM_USERNAMES = "Alum";
  assert.equal(resolveEventRole("Alum", "Hoyas"), "alum");
  assert.equal(canCreateEvents(resolveEventRole("Alum", "Hoyas")), true);
});

test("claimed Mike seed alum is platform admin and can create", () => {
  assert.equal(
    platformRoleForEventActor({
      role: "alum",
      alumId: SEED_ADMIN_ALUMNI_ID,
      username: "Michael Kasten",
    }),
    "admin",
  );
  assert.equal(canCreateEvents({ role: "alum", alumId: SEED_ADMIN_ALUMNI_ID }), true);
});

test("board list wins over alum list", () => {
  process.env.HOYA_BOARD_USERNAMES = "Lars";
  process.env.HOYA_ALUM_USERNAMES = "Lars";
  assert.equal(resolveEventRole("Lars", "Hoyas"), "board");
});
