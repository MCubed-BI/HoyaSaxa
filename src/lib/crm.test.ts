import assert from "node:assert/strict";
import { test } from "node:test";
import {
  channelLabel,
  isContactNoteKind,
  normalizeContactNoteKind,
  noteKindLabel,
  truncateSnippet,
} from "./crm";

test("normalizeContactNoteKind defaults and accepts known kinds", () => {
  assert.equal(normalizeContactNoteKind("donation_call"), "donation_call");
  assert.equal(normalizeContactNoteKind("note"), "note");
  assert.equal(normalizeContactNoteKind("other"), "donation_call");
  assert.equal(normalizeContactNoteKind(null), "donation_call");
  assert.equal(isContactNoteKind("donation_call"), true);
  assert.equal(isContactNoteKind("push"), false);
});

test("channel and note labels", () => {
  assert.equal(channelLabel("text"), "Text");
  assert.equal(channelLabel("email"), "Email");
  assert.equal(channelLabel("push"), "Push");
  assert.equal(noteKindLabel("donation_call"), "Donation call");
  assert.equal(noteKindLabel("note"), "Note");
});

test("truncateSnippet collapses whitespace and ellipsizes", () => {
  assert.equal(truncateSnippet("  hello   world  "), "hello world");
  assert.equal(truncateSnippet("a".repeat(10), 10), "aaaaaaaaaa");
  assert.equal(truncateSnippet("a".repeat(12), 10), `${"a".repeat(9)}…`);
});
