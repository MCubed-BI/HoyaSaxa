import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  UPSERT_BOARD_STAFF_ROLE_SQL,
  boardGrantDecision,
  isAlumniRecordId,
  isOnConflictTargetMissing,
  isStaffRolesUniqueViolation,
  staffRoleIdentity,
} from "./staff-roles";

describe("staff_roles Board grant", () => {
  it("upserts Board and never demotes Admin", () => {
    assert.deepEqual(boardGrantDecision(null, true), { action: "upsert-board" });
    assert.deepEqual(boardGrantDecision("alum", true), { action: "upsert-board" });
    assert.deepEqual(boardGrantDecision("board", false), { action: "delete-board" });
    assert.deepEqual(boardGrantDecision("coach", false), { action: "delete-board" });
    assert.deepEqual(boardGrantDecision("owner", true), { action: "keep-admin" });
    assert.deepEqual(boardGrantDecision("admin", false), { action: "keep-admin" });
  });

  it("requires a roster UUID to persist a grant", () => {
    assert.equal(isAlumniRecordId("c8fc1d9c-d5a7-445d-8e59-b2bddd53d136"), true);
    assert.equal(isAlumniRecordId("locker-1"), false);
    assert.equal(isAlumniRecordId(""), false);
  });

  it("matches staff_roles by username case-insensitively so Grant Board upserts", () => {
    assert.deepEqual(
      staffRoleIdentity({
        alumniId: "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136",
        name: "Tim Barnes",
        email: "tim@example.com",
      }),
      {
        alumniId: "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136",
        username: "Tim Barnes",
        email: "tim@example.com",
      },
    );
    assert.match(UPSERT_BOARD_STAFF_ROLE_SQL, /ON CONFLICT \(\(lower\(username\)\)\)/i);
    assert.match(UPSERT_BOARD_STAFF_ROLE_SQL, /DO UPDATE SET/i);
    assert.match(UPSERT_BOARD_STAFF_ROLE_SQL, /staff_roles_username_lower|alumni_id = COALESCE/i);
  });

  it("treats staff_roles_username_lower as a recoverable unique conflict", () => {
    assert.equal(
      isStaffRolesUniqueViolation({
        code: "23505",
        message: 'duplicate key value violates unique constraint "staff_roles_username_lower"',
      }),
      true,
    );
    assert.equal(isStaffRolesUniqueViolation(new Error("DATABASE_URL is not set")), false);
    assert.equal(isStaffRolesUniqueViolation({ message: "Could not update Board member" }), false);
    assert.equal(
      isOnConflictTargetMissing(new Error("there is no unique or exclusion constraint matching the ON CONFLICT specification")),
      true,
    );
  });
});
