import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FEED_SECTIONS,
  NEWSFLASH_REDIRECT,
  canPostToFeedSection,
  canonicalizeFeedSection,
  deniedFeedSectionMessage,
  feedSectionFromLegacySource,
  feedSectionPath,
  parseFeedSectionParam,
} from "./feed-sections";

describe("feed sections", () => {
  it("exports canonical keys and aliases newsflash to board", () => {
    assert.deepEqual([...FEED_SECTIONS], ["brothers", "board", "sgarlata"]);
    assert.equal(canonicalizeFeedSection("newsflash"), "board");
    assert.equal(canonicalizeFeedSection("NEWS"), "board");
    assert.equal(canonicalizeFeedSection("from-sgarlata"), "sgarlata");
    assert.equal(canonicalizeFeedSection("headcoach"), "sgarlata");
    assert.equal(canonicalizeFeedSection("brother"), "brothers");
    assert.equal(canonicalizeFeedSection("unknown"), null);
    assert.equal(feedSectionFromLegacySource("newsflash"), "board");
    assert.equal(NEWSFLASH_REDIRECT, "/board");
    assert.equal(feedSectionPath("newsflash"), "/board");
    assert.equal(parseFeedSectionParam(["newsflash"], "brothers"), "board");
  });

  it("enforces who can post where", () => {
    assert.equal(canPostToFeedSection("alum", "brothers"), true);
    assert.equal(canPostToFeedSection("alum", "board"), false);
    assert.equal(canPostToFeedSection("alum", "sgarlata"), false);
    assert.equal(canPostToFeedSection("board", "brothers"), true);
    assert.equal(canPostToFeedSection("board", "board"), true);
    assert.equal(canPostToFeedSection("board", "sgarlata"), false);
    assert.equal(canPostToFeedSection("admin", "brothers"), true);
    assert.equal(canPostToFeedSection("admin", "sgarlata"), true);
    assert.equal(canPostToFeedSection("admin", "board"), true);
    assert.match(deniedFeedSectionMessage("alum", "board") ?? "", /board and admin/i);
    assert.match(deniedFeedSectionMessage("alum", "sgarlata") ?? "", /admin/);
    assert.match(deniedFeedSectionMessage("board", "sgarlata") ?? "", /admin/);
    assert.equal(deniedFeedSectionMessage("alum", "brothers"), null);
    assert.equal(deniedFeedSectionMessage("board", "board"), null);
    assert.equal(deniedFeedSectionMessage("admin", "sgarlata"), null);
  });
});
