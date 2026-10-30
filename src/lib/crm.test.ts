import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isCrmNoteKind,
  isOutgoingOutreachStatus,
  CRM_NOTE_KINDS,
  CRM_OUTREACH_CHANNELS,
  CRM_OUTREACH_SENT_STATUS,
} from "./crm";

test("CRM note kinds and outreach channels stay stable", () => {
  assert.deepEqual([...CRM_NOTE_KINDS], ["note", "donation_call"]);
  assert.deepEqual([...CRM_OUTREACH_CHANNELS], ["sms", "email", "push"]);
  assert.equal(isCrmNoteKind("donation_call"), true);
  assert.equal(isCrmNoteKind("note"), true);
  assert.equal(isCrmNoteKind("email"), false);
});

test("CRM outreach history only treats sent deliveries as outgoing", () => {
  assert.equal(CRM_OUTREACH_SENT_STATUS, "sent");
  assert.equal(isOutgoingOutreachStatus("sent"), true);
  assert.equal(isOutgoingOutreachStatus("SENT"), true);
  assert.equal(isOutgoingOutreachStatus("failed"), false);
  assert.equal(isOutgoingOutreachStatus("skipped"), false);
  assert.equal(isOutgoingOutreachStatus("pending"), false);
  assert.equal(isOutgoingOutreachStatus("fallback"), false);
});
