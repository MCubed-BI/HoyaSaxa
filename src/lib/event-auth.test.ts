import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { canCreateEvents, parseUsernameList, resolveEventRole } from "@/lib/event-auth";

const originalBoard = process.env.HOYA_BOARD_USERNAMES;
const originalAlum = process.env.HOYA_ALUM_USERNAMES;

afterEach(() => {
  if (originalBoard === undefined) delete process.env.HOYA_BOARD_USERNAMES;
  else process.env.HOYA_BOARD_USERNAMES = originalBoard;
  if (originalAlum === undefined) delete process.env.HOYA_ALUM_USERNAMES;
  else process.env.HOYA_ALUM_USERNAMES = originalAlum;
});

test("parseUsernameList splits and de-dupes", () => {
  assert.deepEqual(parseUsernameList("Lars, board,Lars"), ["Lars", "board"]);
  assert.deepEqual(parseUsernameList("  "), []);
});

test("Create Event is allowed for coach and board only", () => {
  assert.equal(canCreateEvents("coach"), true);
  assert.equal(canCreateEvents("board"), true);
  assert.equal(canCreateEvents("alum"), false);
  assert.equal(canCreateEvents(null), false);
});

test("shared staff login (Hoyas) resolves to coach", () => {
  delete process.env.HOYA_BOARD_USERNAMES;
  delete process.env.HOYA_ALUM_USERNAMES;
  assert.equal(resolveEventRole("Hoyas", "Hoyas"), "coach");
  assert.equal(canCreateEvents(resolveEventRole("Hoyas", "Hoyas")), true);
});

test("HOYA_BOARD_USERNAMES maps to board and can create", () => {
  process.env.HOYA_BOARD_USERNAMES = "Lars";
  assert.equal(resolveEventRole("lars", "Hoyas"), "board");
  assert.equal(canCreateEvents("board"), true);
});

test("HOYA_ALUM_USERNAMES maps to alum and cannot create", () => {
  process.env.HOYA_ALUM_USERNAMES = "Alum";
  assert.equal(resolveEventRole("Alum", "Hoyas"), "alum");
  assert.equal(canCreateEvents(resolveEventRole("Alum", "Hoyas")), false);
});

test("board list wins over alum list", () => {
  process.env.HOYA_BOARD_USERNAMES = "Lars";
  process.env.HOYA_ALUM_USERNAMES = "Lars";
  assert.equal(resolveEventRole("Lars", "Hoyas"), "board");
});
