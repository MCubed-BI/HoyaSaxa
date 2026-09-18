import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  canPostNewsflash,
  createHoyaAlumSessionToken,
  isValidHoyaAlumSession,
  lockerAlumUsernames,
  lockerBoardUsernames,
  readHoyaAlumSession,
  verifyLockerCredentials,
} from "./hoya-alum-session";
import { filterFeedPosts, isFeedTab, newsflashToFeedPost, type FeedPost } from "./locker-data";
import { isLockerPath, isPublicPath, loginPathFor } from "./locker-paths";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("hoya_alum_session", () => {
  it("defaults Lars as board and Alum as alumnus", () => {
    delete process.env.HOYA_BOARD_USERNAMES;
    delete process.env.HOYA_ALUM_USERNAMES;
    assert.deepEqual(lockerBoardUsernames(), ["Lars"]);
    assert.deepEqual(lockerAlumUsernames(), ["Alum"]);
  });

  it("issues a signed cookie payload with role=board", () => {
    const token = createHoyaAlumSessionToken("board", "Lars");
    const session = readHoyaAlumSession(token);
    assert.equal(session?.role, "board");
    assert.equal(session?.label, "Lars");
    assert.equal(isValidHoyaAlumSession(token), true);
    assert.equal(isValidHoyaAlumSession(`${token}x`), false);
    assert.equal(isValidHoyaAlumSession("not-a-token"), false);
  });

  it("lets board write Newsflash and alum only read", () => {
    assert.equal(canPostNewsflash("board"), true);
    assert.equal(canPostNewsflash("alum"), false);
    assert.equal(canPostNewsflash("coach"), false);
  });

  it("verifies locker demo credentials", () => {
    process.env.COACH_PASSWORD = "Sgarlata35";
    delete process.env.HOYA_BOARD_PASSWORD;
    delete process.env.HOYA_ALUM_PASSWORD;
    delete process.env.HOYA_LOCKER_PASSWORD;
    assert.deepEqual(verifyLockerCredentials("Lars", "Sgarlata35"), { role: "board", label: "Lars" });
    assert.deepEqual(verifyLockerCredentials("Alum", "Sgarlata35"), { role: "alum", label: "Alum" });
    assert.equal(verifyLockerCredentials("Lars", "wrong"), null);
    assert.equal(verifyLockerCredentials("Hoyas", "Sgarlata35"), null);
  });
});

describe("locker paths", () => {
  it("keeps locker login public and locker surfaces allowlisted", () => {
    assert.equal(isPublicPath("/home/login"), true);
    assert.equal(isPublicPath("/api/locker/login"), true);
    assert.equal(isPublicPath("/directory"), true);
    assert.equal(isPublicPath("/athletes/abc"), true);
    assert.equal(isPublicPath("/home"), false);
    assert.equal(isLockerPath("/home"), true);
    assert.equal(isLockerPath("/feed"), true);
    assert.equal(isLockerPath("/newsflash"), true);
    assert.equal(isLockerPath("/events"), true);
    assert.equal(isLockerPath("/api/events"), true);
    assert.equal(isLockerPath("/"), false);
    assert.equal(isLockerPath("/register"), false);
    assert.equal(loginPathFor("/newsflash"), "/home/login");
    assert.equal(loginPathFor("/"), "/login");
  });
});

describe("for you feed", () => {
  const posts: FeedPost[] = [
    newsflashToFeedPost({
      id: "1",
      title: "Board note",
      body: "Official",
      event_at: null,
      author_label: "Lars",
      created_at: "2026-09-18T00:00:00.000Z",
    }),
    {
      id: "2",
      author_label: "Pat",
      author_role: "alum",
      audience: "alumni",
      title: "Hello",
      body: "Alumni post",
      created_at: "2026-09-17T00:00:00.000Z",
      source: "feed",
    },
  ];

  it("keeps official + alumni on For You and stubs teammates/following", () => {
    assert.equal(isFeedTab("for-you"), true);
    assert.equal(filterFeedPosts(posts, "for-you").length, 2);
    assert.equal(filterFeedPosts(posts, "alumni").every((post) => post.author_role === "alum"), true);
    assert.deepEqual(filterFeedPosts(posts, "teammates"), []);
    assert.deepEqual(filterFeedPosts(posts, "following"), []);
  });
});
