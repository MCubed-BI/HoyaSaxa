import assert from "node:assert/strict";
import { test } from "node:test";
import { isCrmNoteKind, CRM_NOTE_KINDS, CRM_OUTREACH_CHANNELS } from "./crm";

test("CRM note kinds and outreach channels stay stable", () => {
  assert.deepEqual([...CRM_NOTE_KINDS], ["note", "donation_call"]);
  assert.deepEqual([...CRM_OUTREACH_CHANNELS], ["sms", "email", "push"]);
  assert.equal(isCrmNoteKind("donation_call"), true);
  assert.equal(isCrmNoteKind("note"), true);
  assert.equal(isCrmNoteKind("email"), false);
});
