import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
import {
  canMessageHoyaProfile,
  canPostToMessageChannel,
  canViewMessageChannel,
  dmChannelSlug,
  dmDisplayName,
  dmPair,
  isDmChannel,
} from "./messages-dm";

function channel(partial: Partial<MessageChannelRow> & Pick<MessageChannelRow, "slug" | "kind" | "unread_count">) {
  return {
    id: partial.id ?? partial.slug,
    name: partial.name ?? partial.slug,
    description: null,
    is_pinned: partial.is_pinned ?? false,
    participant_a: partial.participant_a ?? null,
    participant_b: partial.participant_b ?? null,
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
  const patrick = "11111111-1111-4111-8111-111111111111";
  const tim = "22222222-2222-4222-8222-222222222222";
  const channels = [
    channel({ slug: "sgarlata", kind: "official", unread_count: 2, is_pinned: true }),
    channel({ slug: "d-line", kind: "group", unread_count: 0 }),
    channel({ slug: "class-2015", kind: "group", unread_count: 1 }),
    channel({
      slug: dmChannelSlug(patrick, tim),
      kind: "dm",
      name: "Patrick Finnegan · Tim Barnes",
      unread_count: 1,
      participant_a: patrick,
      participant_b: tim,
    }),
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
      ["sgarlata", "d-line", "class-2015", dmChannelSlug(patrick, tim)],
    );
    assert.deepEqual(
      filterMessageChannels(channels, "unread").map((row) => row.slug),
      ["sgarlata", "class-2015", dmChannelSlug(patrick, tim)],
    );
    assert.deepEqual(
      filterMessageChannels(channels, "groups").map((row) => row.slug),
      ["d-line", "class-2015"],
    );
  });
});

describe("alum to Hoya profile DM", () => {
  const patrick = "11111111-1111-4111-8111-111111111111";
  const tim = "22222222-2222-4222-8222-222222222222";
  const dm = channel({
    slug: dmChannelSlug(tim, patrick),
    kind: "dm",
    name: "Patrick Finnegan · Tim Barnes",
    unread_count: 0,
    participant_a: patrick,
    participant_b: tim,
  });

  it("uses a stable dm slug regardless of who opens the thread", () => {
    assert.equal(dmChannelSlug(patrick, tim), dmChannelSlug(tim, patrick));
    assert.equal(dmPair(tim, "Tim Barnes", patrick, "Patrick Finnegan").slug, dm.slug);
    assert.equal(isDmChannel(dm), true);
    assert.equal(isDmChannel({ kind: "official", slug: "sgarlata" }), false);
  });

  it("shows the Message CTA only for a claimed alum viewing another Hoya", () => {
    assert.equal(canMessageHoyaProfile({ viewerAlumniId: patrick, targetAlumniId: tim }), true);
    assert.equal(canMessageHoyaProfile({ viewerAlumniId: patrick, targetAlumniId: patrick }), false);
    assert.equal(canMessageHoyaProfile({ viewerAlumniId: null, targetAlumniId: tim }), false);
    assert.equal(
      canMessageHoyaProfile({
        viewerAlumniId: "00000000-0000-0000-0000-000000000000",
        targetAlumniId: tim,
      }),
      false,
    );
  });

  it("keeps DM threads private to participants and lets both send", () => {
    const alum = {
      kind: "alum" as const,
      label: "Patrick Finnegan",
      viewerKey: `alum:contract:${patrick}`,
      canPost: false,
      alumniId: patrick,
    };
    const otherAlum = { ...alum, alumniId: "33333333-3333-4333-8333-333333333333", label: "Other" };
    const staff = {
      kind: "staff" as const,
      label: "Hoyas",
      viewerKey: "staff:hoyas",
      canPost: true,
      alumniId: null,
    };
    assert.equal(canViewMessageChannel(dm, patrick), true);
    assert.equal(canViewMessageChannel(dm, tim), true);
    assert.equal(canViewMessageChannel(dm, otherAlum.alumniId), false);
    assert.equal(canViewMessageChannel({ kind: "official", slug: "sgarlata" }, null), true);
    assert.equal(canPostToMessageChannel(dm, alum), true);
    assert.equal(canPostToMessageChannel(dm, { ...alum, alumniId: tim, label: "Tim Barnes" }), true);
    assert.equal(canPostToMessageChannel(dm, otherAlum), false);
    assert.equal(canPostToMessageChannel(dm, staff), false);
    assert.equal(canPostToMessageChannel({ kind: "official", slug: "sgarlata" }, staff), true);
    assert.equal(canPostToMessageChannel({ kind: "official", slug: "sgarlata" }, alum), false);
    assert.equal(dmDisplayName(dm, patrick), "Tim Barnes");
    assert.equal(dmDisplayName(dm, tim), "Patrick Finnegan");
  });

  it("keeps the Message CTA on Hoya athlete profiles", () => {
    const page = readFileSync(join(process.cwd(), "src/app/(hoya)/athletes/[id]/page.tsx"), "utf8");
    assert.match(page, /ProfileMessageCta/);
    assert.match(page, /canMessageHoyaProfile/);
  });
});
