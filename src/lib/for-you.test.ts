import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FEED_SECTIONS,
  NEWSFLASH_REDIRECT,
  canonicalizeFeedSection,
  feedSectionPath,
} from "./feed-sections";
import { feedPostToCard, forYouEmptyCopy, forYouHeading, identityFromLabel } from "./for-you";
import { DEMO_FEED, DEMO_NEWSFLASH, filterFeedPostsBySection, newsflashToFeedPost } from "./locker-data";
import { portalMoreItems, portalSecondaryItems, navItemsForRole } from "./nav";

describe("for you myspace stack", () => {
  it("uses PR #17 feed keys only", () => {
    assert.deepEqual([...FEED_SECTIONS], ["brothers", "board", "sgarlata"]);
    assert.equal(canonicalizeFeedSection("newsflash"), "board");
    assert.equal(NEWSFLASH_REDIRECT, "/board");
    assert.equal(feedSectionPath("newsflash"), "/board");
    assert.equal(forYouHeading("brothers"), "From Your Brothers");
    assert.equal(forYouHeading("board"), "From Your Board");
    assert.equal(forYouHeading("sgarlata"), "From Sgarlata");
    assert.match(forYouEmptyCopy("board"), /Board/i);
  });

  it("splits locker feed onto brothers | board | sgarlata", () => {
    const feed = [...DEMO_NEWSFLASH.map(newsflashToFeedPost), ...DEMO_FEED];
    const brothers = filterFeedPostsBySection(feed, "brothers").map(feedPostToCard);
    const board = filterFeedPostsBySection(feed, "board").map(feedPostToCard);
    const sgarlata = filterFeedPostsBySection(feed, "sgarlata").map(feedPostToCard);
    assert.equal(brothers.every((post) => post.section === "brothers"), true);
    assert.equal(board.every((post) => post.section === "board"), true);
    assert.ok(brothers.some((post) => post.authorLabel.includes("Pat")));
    assert.ok(board.length >= 1);
    assert.equal(sgarlata.length, 0);
  });

  it("builds an identity strip from a viewer label", () => {
    const identity = identityFromLabel("Pat Hoya");
    assert.equal(identity.name, "Pat Hoya");
    assert.equal(identity.lockerHref, "/home");
    assert.equal(identity.firstName, "Pat");
  });

  it("keeps Newsflash out of nav chrome", () => {
    assert.equal(
      portalSecondaryItems().some((item) => item.key === "newsflash" || item.href === "/newsflash"),
      false,
    );
    assert.equal(
      portalMoreItems("alum").some((item) => item.key === "newsflash" || item.href === "/newsflash"),
      false,
    );
    assert.equal(
      navItemsForRole("owner").some((item) => item.href === "/newsflash" || item.key === "newsflash"),
      false,
    );
    assert.equal(portalSecondaryItems().some((item) => item.key === "feed"), true);
    assert.equal(portalSecondaryItems().some((item) => item.key === "board"), true);
  });
});
