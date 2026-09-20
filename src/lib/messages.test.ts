import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createAlumniSessionToken,
  HOYA_ALUM_SESSION_COOKIE,
  LEGACY_ALUMNI_SESSION_COOKIE,
  readAlumniSessionAccountId,
  readAlumniSessionFromCookies,
} from "./alumni-auth";
import { createHoyaAlumSessionToken, readHoyaAlumSession } from "./hoya-alum-session";
import {
  canPostSgarlata,
  isAlumAllowedPath,
  isDataSyncPath,
  isPublicPath,
  lockerAccountId,
  loginPathFor,
  verifyAlumAccessCode,
} from "./messages-auth";
import { filterMessageChannels, parseMessageFilter, type MessageChannelRow } from "./messages";

function channel(partial: Partial<MessageChannelRow> & Pick<MessageChannelRow, "slug" | "kind" | "unread_count">) {
  return {
    id: partial.id ?? partial.slug,
    name: partial.name ?? partial.slug,
    description: null,
    is_pinned: partial.is_pinned ?? false,
    created_at: "2026-09-18T00:00:00.000Z",
    last_post_at: null,
    last_post_preview: null,
    last_read_at: null,
    ...partial,
  } satisfies MessageChannelRow;
}

describe("alum session cookies", () => {
  it("mints and verifies hoya_alum_session tokens", () => {
    const token = createAlumniSessionToken("locker:pat@hoyas.edu");
    assert.equal(readAlumniSessionAccountId(token), "locker:pat@hoyas.edu");
    const uuid = "2c1f0a1e-6b2a-4f3d-9c8e-1a2b3c4d5e6f";
    assert.equal(readAlumniSessionAccountId(createAlumniSessionToken(uuid)), uuid);
  });

  it("reads hoya_alum_session first and falls back to ga_alumni_session", () => {
    const cookies: Record<string, string> = {
      [LEGACY_ALUMNI_SESSION_COOKIE]: createAlumniSessionToken("account-from-register"),
    };
    const legacy = readAlumniSessionFromCookies((name) => cookies[name]);
    assert.equal(legacy?.accountId, "account-from-register");
    assert.equal(legacy?.cookie, LEGACY_ALUMNI_SESSION_COOKIE);

    cookies[HOYA_ALUM_SESSION_COOKIE] = createAlumniSessionToken("locker:guest");
    const primary = readAlumniSessionFromCookies((name) => cookies[name]);
    assert.equal(primary?.accountId, "locker:guest");
    assert.equal(primary?.cookie, HOYA_ALUM_SESSION_COOKIE);
  });

  it("does not treat Home/Newsflash locker tokens as messages access-code sessions", () => {
    const lockerToken = createHoyaAlumSessionToken("board", "Lars");
    assert.equal(readHoyaAlumSession(lockerToken)?.role, "board");
    assert.equal(readAlumniSessionAccountId(lockerToken), null);
    assert.equal(readHoyaAlumSession(createAlumniSessionToken("locker:guest")), null);
  });
});

describe("messages path gate", () => {
  it("keeps locker + alum session public, messages allowlisted, and Data Sync staff-only", () => {
    assert.equal(isPublicPath("/locker"), true);
    assert.equal(isPublicPath("/api/messages/alum-session"), true);
    assert.equal(isAlumAllowedPath("/messages"), true);
    assert.equal(isAlumAllowedPath("/messages/sgarlata"), true);
    assert.equal(isAlumAllowedPath("/message"), true);
    assert.equal(isAlumAllowedPath("/api/messages/channels/sgarlata/posts"), true);
    assert.equal(isAlumAllowedPath("/sync"), false);
    assert.equal(isAlumAllowedPath("/api/data-sync"), false);
    assert.equal(isDataSyncPath("/sync"), true);
    assert.equal(isDataSyncPath("/api/data-sync/abc/apply"), true);
    assert.equal(loginPathFor("/messages"), "/locker");
    assert.equal(loginPathFor("/sync"), "/login");
  });

  it("lets staff post to Sgarlata and keeps alums read-only", () => {
    assert.equal(canPostSgarlata({ kind: "staff", label: "Staff", viewerKey: "staff", canPost: true }), true);
    assert.equal(canPostSgarlata({ kind: "staff", label: "Board", viewerKey: "staff:board", canPost: false }), false);
    assert.equal(canPostSgarlata({ kind: "alum", label: "Alumnus", viewerKey: "alum:x", canPost: false }), false);
    assert.equal(lockerAccountId("Pat@Hoyas.edu"), "locker:pat@hoyas.edu");
    assert.equal(verifyAlumAccessCode("HoyaSaxa"), true);
    assert.equal(verifyAlumAccessCode("wrong"), false);
  });
});

describe("message filters", () => {
  const channels = [
    channel({ slug: "sgarlata", kind: "official", unread_count: 2, is_pinned: true }),
    channel({ slug: "d-line", kind: "group", unread_count: 0 }),
    channel({ slug: "class-2015", kind: "group", unread_count: 1 }),
  ];

  it("parses All / Unread / Groups", () => {
    assert.equal(parseMessageFilter(undefined), "all");
    assert.equal(parseMessageFilter("unread"), "unread");
    assert.equal(parseMessageFilter(["groups"]), "groups");
    assert.equal(parseMessageFilter("nope"), "all");
  });

  it("filters inbox rows", () => {
    assert.deepEqual(
      filterMessageChannels(channels, "all").map((row) => row.slug),
      ["sgarlata", "d-line", "class-2015"],
    );
    assert.deepEqual(
      filterMessageChannels(channels, "unread").map((row) => row.slug),
      ["sgarlata", "class-2015"],
    );
    assert.deepEqual(
      filterMessageChannels(channels, "groups").map((row) => row.slug),
      ["d-line", "class-2015"],
    );
  });
});
