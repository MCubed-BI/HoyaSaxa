import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { PREVIEW_ALUMNI_ID } from "./alum-preview";
import {
  clampMessagePostsLimit,
  dmUnreadTotal,
  formatUnreadBadgeLabel,
  isInboxVisibleChannel,
  isMessageableAlumniId,
  isOwnMessagePost,
  jsonAccessDenied,
  MESSAGE_POSTS_MAX_LIMIT,
  MESSAGE_POSTS_PAGE_SIZE,
  messageReadKeys,
  paginateMessagePosts,
  parseMessagePostsQuery,
  serializeMessageChannel,
  unreadCountForChannel,
  wantsJsonRequest,
} from "./messages-api";
import { filterMessageChannels, type MessageChannelRow, type MessagePostRow } from "./messages";
import {
  canMessageActorTarget,
  canPostToMessageChannel,
  canViewMessageChannel,
  dmChannelSlug,
  staffDmParticipantId,
} from "./messages-dm";

const patrick = "11111111-1111-4111-8111-111111111111";
const tim = "22222222-2222-4222-8222-222222222222";
const other = "33333333-3333-4333-8333-333333333333";

function channel(
  partial: Partial<MessageChannelRow> & Pick<MessageChannelRow, "slug" | "kind" | "unread_count">,
): MessageChannelRow {
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
  };
}

function post(partial: Partial<MessagePostRow> & Pick<MessagePostRow, "id" | "body" | "created_at">): MessagePostRow {
  return {
    channel_id: "ch",
    title: null,
    author_role: "alum",
    author_label: "Pat",
    ...partial,
  };
}

const dm = channel({
  slug: dmChannelSlug(patrick, tim),
  kind: "dm",
  name: "Patrick Finnegan · Tim Barnes",
  unread_count: 3,
  participant_a: patrick,
  participant_b: tim,
});

const sgarlata = channel({
  slug: "sgarlata",
  kind: "official",
  unread_count: 12,
  is_pinned: true,
});

const group = channel({
  slug: "class-2015",
  kind: "group",
  unread_count: 8,
});

const alum = {
  kind: "alum" as const,
  label: "Patrick Finnegan",
  viewerKey: `alum:contract:${patrick}`,
  canPost: false,
  alumniId: patrick,
};

const otherAlum = {
  kind: "alum" as const,
  label: "Other",
  viewerKey: `alum:contract:${other}`,
  canPost: false,
  alumniId: other,
};

const staff = {
  kind: "staff" as const,
  label: "Hoyas",
  viewerKey: "staff:hoyas",
  canPost: true,
  isAdmin: true,
  alumniId: null,
};

describe("message JSON access", () => {
  it("blocks a user from reading or posting to a DM they are not in", () => {
    assert.equal(canViewMessageChannel(dm, alum), true);
    assert.equal(canPostToMessageChannel(dm, alum), true);
    assert.equal(jsonAccessDenied({ viewer: alum, channel: dm, action: "read" }), null);
    assert.equal(jsonAccessDenied({ viewer: alum, channel: dm, action: "post" }), null);

    assert.equal(canViewMessageChannel(dm, otherAlum), false);
    assert.equal(canPostToMessageChannel(dm, otherAlum), false);
    assert.deepEqual(jsonAccessDenied({ viewer: otherAlum, channel: dm, action: "read" }), {
      status: 404,
      error: "Channel not found",
    });
    assert.deepEqual(jsonAccessDenied({ viewer: otherAlum, channel: dm, action: "post" }), {
      status: 403,
      error: "Forbidden",
    });
    assert.deepEqual(jsonAccessDenied({ viewer: staff, channel: dm, action: "read" }), {
      status: 404,
      error: "Channel not found",
    });
  });

  it("requires auth and hides seeded group channels", () => {
    assert.deepEqual(jsonAccessDenied({ viewer: null, channel: dm, action: "read" }), {
      status: 401,
      error: "Unauthorized",
    });
    assert.equal(isInboxVisibleChannel(group), false);
    assert.deepEqual(jsonAccessDenied({ viewer: alum, channel: group, action: "read" }), {
      status: 404,
      error: "Channel not found",
    });
    assert.equal(jsonAccessDenied({ viewer: alum, channel: sgarlata, action: "read" }), null);
    assert.deepEqual(jsonAccessDenied({ viewer: alum, channel: sgarlata, action: "post" }), {
      status: 403,
      error: "Forbidden",
    });
    assert.equal(jsonAccessDenied({ viewer: staff, channel: sgarlata, action: "post" }), null);
  });
});

describe("unread counts", () => {
  it("counts only unread DM posts for the nav badge", () => {
    const channels = [
      sgarlata,
      group,
      dm,
      channel({
        slug: dmChannelSlug(patrick, other),
        kind: "dm",
        unread_count: 1,
        participant_a: patrick,
        participant_b: other,
      }),
    ];
    assert.equal(dmUnreadTotal(channels), 4);
    assert.equal(formatUnreadBadgeLabel(0), null);
    assert.equal(formatUnreadBadgeLabel(2), "2");
    assert.equal(formatUnreadBadgeLabel(9), "9");
    assert.equal(formatUnreadBadgeLabel(10), "9+");
  });

  it("does not count the viewer's own posts as unread", () => {
    const posts = [
      post({
        id: "1",
        body: "from me",
        created_at: "2026-11-10T12:00:00.000Z",
        author_label: "Patrick Finnegan",
      }),
      post({
        id: "2",
        body: "from them",
        created_at: "2026-11-10T12:01:00.000Z",
        author_label: "Tim Barnes",
      }),
    ];
    assert.equal(isOwnMessagePost(posts[0]!, { authorLabel: "Patrick Finnegan", participantId: patrick }), true);
    assert.equal(isOwnMessagePost(posts[1]!, { authorLabel: "Patrick Finnegan", participantId: patrick }), false);
    assert.equal(
      unreadCountForChannel(dm, posts, { lastReadAt: null, authorLabel: "Patrick Finnegan", participantId: patrick }),
      1,
    );
  });

  it("dual-writes a stable participant key next to the session viewer_key", () => {
    assert.deepEqual(messageReadKeys(alum), [`alum:contract:${patrick}`, patrick]);
    assert.deepEqual(messageReadKeys(staff), ["staff:hoyas", staffDmParticipantId("Hoyas")]);
    assert.match(readFileSync(join(process.cwd(), "src/lib/messages.ts"), "utf8"), /markChannelReadKeys/);
    assert.match(readFileSync(join(process.cwd(), "src/lib/messages-api.ts"), "utf8"), /stable DM participant id/);
  });
});

describe("message post pagination", () => {
  const posts = Array.from({ length: 5 }, (_, index) =>
    post({
      id: `p${index + 1}`,
      body: `m${index + 1}`,
      created_at: `2026-11-10T12:0${index}:00.000Z`,
    }),
  );

  it("returns the latest page by default and pages older / newer with before / after", () => {
    const latest = paginateMessagePosts(posts, { limit: 2 });
    assert.deepEqual(
      latest.posts.map((row) => row.id),
      ["p4", "p5"],
    );
    assert.equal(latest.hasMoreBefore, true);
    assert.equal(latest.hasMoreAfter, false);

    const older = paginateMessagePosts(posts, { limit: 2, before: "p4" });
    assert.deepEqual(
      older.posts.map((row) => row.id),
      ["p2", "p3"],
    );
    assert.equal(older.hasMoreBefore, true);
    assert.equal(older.hasMoreAfter, true);

    const newest = paginateMessagePosts(posts, { limit: 2, after: "p4" });
    assert.deepEqual(
      newest.posts.map((row) => row.id),
      ["p5"],
    );
    assert.equal(newest.hasMoreAfter, false);
    assert.equal(newest.hasMoreBefore, true);
  });

  it("parses after / before / limit and prefers after for polling", () => {
    const query = parseMessagePostsQuery(new URLSearchParams("after=p4&before=p2&limit=10"));
    assert.equal(query.after, "p4");
    assert.equal(query.before, undefined);
    assert.equal(query.limit, 10);
    assert.equal(clampMessagePostsLimit(999), MESSAGE_POSTS_MAX_LIMIT);
    assert.equal(clampMessagePostsLimit(undefined), MESSAGE_POSTS_PAGE_SIZE);
  });
});

describe("inbox JSON helpers", () => {
  it("hides group shells from All / Unread and serializes DM display names", () => {
    const channels = [sgarlata, group, dm];
    assert.deepEqual(
      filterMessageChannels(channels, "all").map((row) => row.slug),
      ["sgarlata", dm.slug],
    );
    assert.deepEqual(
      filterMessageChannels(channels, "unread").map((row) => row.slug),
      ["sgarlata", dm.slug],
    );
    assert.deepEqual(filterMessageChannels(channels, "groups"), []);
    assert.equal(serializeMessageChannel(dm, patrick).name, "Tim Barnes");
  });

  it("treats JSON Accept or Content-Type as a JSON client", () => {
    assert.equal(
      wantsJsonRequest(new Request("https://example.test", { headers: { accept: "application/json" } })),
      true,
    );
    assert.equal(
      wantsJsonRequest(
        new Request("https://example.test", { headers: { "content-type": "application/json" } }),
      ),
      true,
    );
    assert.equal(wantsJsonRequest(new Request("https://example.test", { headers: { accept: "text/html" } })), false);
  });

  it("does not allow messaging stubs, preview ids, or yourself", () => {
    assert.equal(isMessageableAlumniId(PREVIEW_ALUMNI_ID), false);
    assert.equal(isMessageableAlumniId("locker-demo"), false);
    assert.equal(isMessageableAlumniId(tim), true);
    assert.equal(canMessageActorTarget({ alumniId: patrick }, patrick), false);
    assert.equal(canMessageActorTarget({ alumniId: patrick }, tim), true);
    assert.equal(canMessageActorTarget({ isAdmin: true }, tim), true);
  });
});

describe("message API routes exist", () => {
  it("adds JSON inbox, unread, thread, send, and read routes", () => {
    const files = [
      "src/app/api/messages/route.ts",
      "src/app/api/messages/unread/route.ts",
      "src/app/api/messages/channels/[slug]/route.ts",
      "src/app/api/messages/channels/[slug]/posts/route.ts",
      "src/app/api/messages/channels/[slug]/read/route.ts",
      "src/app/api/messages/dm/route.ts",
    ];
    for (const rel of files) {
      const text = readFileSync(join(process.cwd(), rel), "utf8");
      assert.match(text, /getMessageViewer/);
      assert.match(text, /NextResponse\.json/);
    }
    const inbox = readFileSync(join(process.cwd(), "src/app/api/messages/route.ts"), "utf8");
    assert.match(inbox, /unreadTotal/);
    const unread = readFileSync(join(process.cwd(), "src/app/api/messages/unread/route.ts"), "utf8");
    assert.match(unread, /dmUnreadTotal/);
    const thread = readFileSync(join(process.cwd(), "src/app/api/messages/channels/[slug]/route.ts"), "utf8");
    assert.match(thread, /parseMessagePostsQuery/);
    assert.match(thread, /jsonAccessDenied/);
    const posts = readFileSync(join(process.cwd(), "src/app/api/messages/channels/[slug]/posts/route.ts"), "utf8");
    assert.match(posts, /wantsJsonRequest|application\/json/);
    assert.match(posts, /jsonAccessDenied/);
  });
});
