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
import { isCoachComposePath, allowRequest } from "./access";
import {
  canPostSgarlata,
  isAlumAllowedPath,
  isDataSyncPath,
  isPublicPath,
  lockerAccountId,
  loginPathFor,
  verifyAlumAccessCode,
} from "./messages-auth";
import {
  canMessageAthlete,
  canPostToMessageChannel,
  channelVisibleToViewer,
  dmChannelSlug,
  isDmChannelSlug,
  messageAthleteHref,
  parseDmChannelSlug,
} from "./messages-dm";
import { filterMessageChannels, inboxChannelTitle, parseMessageFilter, type MessageChannelRow } from "./messages";

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
    assert.equal(isAlumAllowedPath("/messages/with/abc"), true);
    assert.equal(isAlumAllowedPath("/message"), true);
    assert.equal(isAlumAllowedPath("/api/messages/channels/sgarlata/posts"), true);
    assert.equal(isAlumAllowedPath("/api/messages/dm"), true);
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

  it("parses All / Unread / Groups / Direct", () => {
    assert.equal(parseMessageFilter(undefined), "all");
    assert.equal(parseMessageFilter("unread"), "unread");
    assert.equal(parseMessageFilter(["groups"]), "groups");
    assert.equal(parseMessageFilter("direct"), "direct");
    assert.equal(parseMessageFilter("nope"), "all");
  });

  it("filters inbox rows", () => {
    const withDm = [
      ...channels,
      channel({ slug: "dm_aaa_bbb", kind: "dm", unread_count: 1, name: "Tim Barnes", peer_name: "Tim Barnes" }),
    ];
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
    assert.deepEqual(
      filterMessageChannels(withDm, "direct").map((row) => row.slug),
      ["dm_aaa_bbb"],
    );
    assert.equal(inboxChannelTitle(withDm[3]!), "Tim Barnes");
  });
});

describe("alum-to-alum direct messages", () => {
  const patrick = "11111111-1111-4111-8111-111111111111";
  const tim = "22222222-2222-4222-8222-222222222222";

  it("builds a stable dm slug and blocks messaging yourself", () => {
    assert.equal(dmChannelSlug(patrick, tim), dmChannelSlug(tim, patrick));
    assert.equal(isDmChannelSlug(dmChannelSlug(patrick, tim)), true);
    assert.deepEqual(parseDmChannelSlug(dmChannelSlug(tim, patrick)), [patrick, tim].sort());
    assert.equal(messageAthleteHref(tim), `/messages/with/${tim}`);
    assert.equal(canMessageAthlete({ viewerAlumniId: patrick, recipientAlumniId: tim }), true);
    assert.equal(canMessageAthlete({ viewerAlumniId: patrick, recipientAlumniId: patrick }), false);
    assert.equal(canMessageAthlete({ viewerAlumniId: null, recipientAlumniId: tim }), false);
  });

  it("lets members post to DMs while Sgarlata stays admin-only", () => {
    const alum = { kind: "alum" as const, label: "Patrick Finnegan", viewerKey: "alum:p", canPost: false, alumniId: patrick };
    const staff = { kind: "staff" as const, label: "Hoyas", viewerKey: "staff", canPost: true, alumniId: null };
    const sgarlata = { slug: "sgarlata", kind: "official" };
    const dm = { slug: dmChannelSlug(patrick, tim), kind: "dm" };
    assert.equal(canPostToMessageChannel(alum, sgarlata), false);
    assert.equal(canPostToMessageChannel(staff, sgarlata), true);
    assert.equal(canPostToMessageChannel(alum, dm), true);
    assert.equal(canPostToMessageChannel(staff, dm), false);
    assert.equal(canPostSgarlata(alum), false);
    assert.equal(canPostSgarlata(staff), true);
  });

  it("hides DMs from non-members and leaves official/group channels public", () => {
    assert.equal(channelVisibleToViewer({ kind: "official" }, null), true);
    assert.equal(channelVisibleToViewer({ kind: "group" }, patrick), true);
    assert.equal(channelVisibleToViewer({ kind: "dm", memberAlumniIds: [patrick, tim] }, tim), true);
    assert.equal(channelVisibleToViewer({ kind: "dm", memberAlumniIds: [patrick, tim] }, "someone-else"), false);
    assert.equal(channelVisibleToViewer({ kind: "dm", memberAlumniIds: [patrick, tim] }, null), false);
  });

  it("does not treat DM compose as a coach-only path", () => {
    const alum = {
      role: "alum" as const,
      mode: "alum" as const,
      source: "alum-session" as const,
      label: "Patrick Finnegan",
      alumniId: patrick,
      verifiedHoya: true,
    };
    assert.equal(isCoachComposePath("/api/messages/dm"), false);
    assert.equal(isCoachComposePath("/api/messages/channels/dm_aaa_bbb/posts"), false);
    assert.equal(allowRequest(alum, "/api/messages/dm", "POST"), true);
    assert.equal(allowRequest(alum, "/api/messages/channels/sgarlata/posts", "POST"), false);
  });
});
