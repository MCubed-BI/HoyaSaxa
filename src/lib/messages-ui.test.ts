import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  groupMessagesByDay,
  INBOX_POLL_MS,
  isNearBottom,
  isOutgoingMessage,
  messageDayKey,
  messageDayLabel,
  THREAD_POLL_MS,
} from "./messages-ui";

describe("chat thread helpers", () => {
  it("puts the viewer's posts on the outgoing side", () => {
    assert.equal(isOutgoingMessage("Patrick Finnegan", "Patrick Finnegan"), true);
    assert.equal(isOutgoingMessage("Tim Barnes", "Patrick Finnegan"), false);
    assert.equal(isOutgoingMessage("Admin", "Admin"), true);
    assert.equal(isOutgoingMessage(null, "Patrick Finnegan"), false);
  });

  it("groups posts with date separators", () => {
    const now = new Date("2026-11-10T15:00:00.000-05:00");
    const posts = [
      { id: "1", created_at: "2026-11-09T16:00:00.000-05:00", body: "yesterday" },
      { id: "2", created_at: "2026-11-10T09:00:00.000-05:00", body: "today a" },
      { id: "3", created_at: "2026-11-10T10:00:00.000-05:00", body: "today b" },
    ];
    assert.equal(messageDayLabel(posts[0]!.created_at, now), "Yesterday");
    assert.equal(messageDayLabel(posts[1]!.created_at, now), "Today");
    assert.equal(messageDayKey(posts[1]!.created_at), messageDayKey(posts[2]!.created_at));
    const groups = groupMessagesByDay(posts);
    assert.equal(groups.length, 2);
    assert.deepEqual(
      groups[1]?.posts.map((post) => post.id),
      ["2", "3"],
    );
  });

  it("treats the user as near the bottom so new posts can auto-scroll", () => {
    const scroller = {
      scrollHeight: 1000,
      scrollTop: 920,
      clientHeight: 80,
    } as HTMLElement;
    assert.equal(isNearBottom(scroller), true);
    scroller.scrollTop = 100;
    assert.equal(isNearBottom(scroller), false);
  });

  it("uses a 4–5s thread poll and a slower inbox poll", () => {
    assert.equal(THREAD_POLL_MS >= 4000 && THREAD_POLL_MS <= 5000, true);
    assert.equal(INBOX_POLL_MS >= 10000, true);
  });
});

describe("chat thread wiring", () => {
  it("renders the client thread on the deep-link page", () => {
    const page = readFileSync(join(process.cwd(), "src/app/(messages)/messages/[slug]/page.tsx"), "utf8");
    const thread = readFileSync(join(process.cwd(), "src/components/messages-thread.tsx"), "utf8");
    const inbox = readFileSync(join(process.cwd(), "src/components/messages-inbox.tsx"), "utf8");
    assert.match(page, /MessagesThread/);
    assert.match(page, /hasMoreBefore/);
    assert.match(thread, /Enter to send/);
    assert.match(thread, /Load earlier/);
    assert.match(thread, /Retry/);
    assert.match(thread, /THREAD_POLL_MS/);
    assert.match(thread, /document\.hidden/);
    assert.match(inbox, /MessagesInboxLive/);
  });
});
