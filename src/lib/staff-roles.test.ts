import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { boardGrantDecision, isAlumniRecordId } from "./staff-roles";

describe("staff_roles Board grant", () => {
  it("upserts Board and never demotes Admin", () => {
    assert.deepEqual(boardGrantDecision(null, true), { action: "upsert-board" });
    assert.deepEqual(boardGrantDecision("alum", true), { action: "upsert-board" });
    assert.deepEqual(boardGrantDecision("board", false), { action: "delete-board" });
    assert.deepEqual(boardGrantDecision("owner", true), { action: "keep-admin" });
    assert.deepEqual(boardGrantDecision("admin", false), { action: "keep-admin" });
  });

  it("requires a roster UUID to persist a grant", () => {
    assert.equal(isAlumniRecordId("c8fc1d9c-d5a7-445d-8e59-b2bddd53d136"), true);
    assert.equal(isAlumniRecordId("locker-1"), false);
    assert.equal(isAlumniRecordId(""), false);
  });
});
