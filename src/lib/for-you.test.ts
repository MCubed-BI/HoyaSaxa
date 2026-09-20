import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALUM_SESSION_COOKIE, createAlumSessionToken } from "./alum-session";
import { SESSION_COOKIE, createSessionToken } from "./auth";
import {
  FEED_SECTIONS,
  NEWSFLASH_REDIRECT,
  canPostToFeedSection,
  canonicalizeFeedSection,
  feedSectionPath,
} from "./feed-sections";
import { createHoyaAlumSessionToken } from "./hoya-alum-session";
import {
  feedPostToCard,
  forYouComposableSections,
  forYouEmptyCopy,
  forYouFilterHref,
  forYouFilterLabel,
  forYouHeading,
  forYouSectionsForFilter,
  identityFromLabel,
  parseForYouFilter,
} from "./for-you";
import { readPlatformRole } from "./platform-session";
import { canPostBoardSection, canPostBrothers } from "./platform-roles";
import { DEMO_FEED, DEMO_NEWSFLASH, filterFeedPostsBySection, newsflashToFeedPost } from "./locker-data";
import {
  alumPrimaryNavItems,
  headerShowsUpdateMe,
  portalMoreItems,
  portalSecondaryItems,
  navItemsForRole,
} from "./nav";
import { PRODUCT_DISPLAY_NAME } from "./product";

describe("for you myspace stack", () => {
  it("uses PR #17 feed keys only", () => {
    assert.deepEqual([...FEED_SECTIONS], ["brothers", "board", "sgarlata"]);
    assert.equal(canonicalizeFeedSection("newsflash"), "board");
    assert.equal(NEWSFLASH_REDIRECT, "/board");
    assert.equal(feedSectionPath("newsflash"), "/board");
    assert.equal(forYouHeading("brothers"), "From Your Brothers");
    assert.equal(forYouHeading("board"), "From Your Board");
    assert.equal(forYouHeading("sgarlata"), "From Your Headcoach");
    assert.match(forYouEmptyCopy("board"), /Board/i);
    assert.equal(canonicalizeFeedSection("headcoach"), "sgarlata");
  });

  it("filters For You onto All / Brothers / Board / Headcoach", () => {
    assert.deepEqual(forYouSectionsForFilter("all"), ["brothers", "board", "sgarlata"]);
    assert.deepEqual(forYouSectionsForFilter("brothers"), ["brothers"]);
    assert.deepEqual(forYouSectionsForFilter("board"), ["board"]);
    assert.deepEqual(forYouSectionsForFilter("sgarlata"), ["sgarlata"]);
    assert.equal(parseForYouFilter(undefined), "all");
    assert.equal(parseForYouFilter("all"), "all");
    assert.equal(parseForYouFilter("brothers"), "brothers");
    assert.equal(parseForYouFilter("board"), "board");
    assert.equal(parseForYouFilter("headcoach"), "sgarlata");
    assert.equal(parseForYouFilter("nope"), "all");
    assert.equal(forYouFilterLabel("all"), "All");
    assert.equal(forYouFilterLabel("brothers"), "Your Brothers");
    assert.equal(forYouFilterLabel("board"), "Board");
    assert.equal(forYouFilterLabel("sgarlata"), "From Your Headcoach");
    assert.equal(forYouFilterHref("all"), "/feed");
    assert.equal(forYouFilterHref("sgarlata"), "/feed?section=sgarlata");
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
    assert.equal(portalSecondaryItems().some((item) => item.key === "board"), false);
    assert.equal(alumPrimaryNavItems().some((item) => item.key === "board"), false);
    assert.equal(portalMoreItems("alum").some((item) => item.key === "board"), false);
    assert.deepEqual(
      alumPrimaryNavItems().map((item) => item.label),
      ["Home", "Directory", "Events", "Giving", "Messages", "For You"],
    );
    assert.equal(headerShowsUpdateMe(true), true);
    assert.equal(headerShowsUpdateMe(true, "me"), false);
    assert.equal(headerShowsUpdateMe(false), false);
  });

  it("locks chrome display name to Georgetown Football Alum Network", () => {
    assert.equal(PRODUCT_DISPLAY_NAME, "Georgetown Football Alum Network");
  });

  it("lets claimed alum compose Brothers only; board and admin keep their sections", () => {
    assert.deepEqual(forYouComposableSections("alum"), ["brothers"]);
    assert.deepEqual(forYouComposableSections("board"), ["brothers", "board"]);
    assert.deepEqual(forYouComposableSections("admin"), ["brothers", "board", "sgarlata"]);
    assert.equal(canPostBrothers("alum"), true);
    assert.equal(canPostBoardSection("alum"), false);
    assert.equal(canPostToFeedSection("alum", "sgarlata"), false);
    assert.equal(canPostBoardSection("board"), true);
    assert.equal(canPostToFeedSection("board", "sgarlata"), false);
    assert.equal(canPostToFeedSection("admin", "sgarlata"), true);
  });
});

function cookieJar(values: Record<string, string>) {
  return {
    get(name: string) {
      return values[name] ? { value: values[name] } : undefined;
    },
  };
}

describe("for you compose sessions", () => {
  it("allows a claimed hoya_alum_session alum (Tim Barnes) to post Brothers only", () => {
    const claimed = createAlumSessionToken({
      role: "alum",
      alumniId: "11111111-1111-4111-8111-111111111111",
      email: "tim.barnes@example.com",
      name: "Tim Barnes",
    });
    const role = readPlatformRole(cookieJar({ [ALUM_SESSION_COOKIE]: claimed }));
    assert.equal(role, "alum");
    assert.deepEqual(forYouComposableSections(role!), ["brothers"]);
    assert.equal(canPostToFeedSection(role!, "brothers"), true);
    assert.equal(canPostToFeedSection(role!, "board"), false);
    assert.equal(canPostToFeedSection(role!, "sgarlata"), false);
  });

  it("lets a locker preview alum compose Brothers and denies Board / Sgarlata", () => {
    const lockerAlum = createHoyaAlumSessionToken("alum", "Alum");
    const role = readPlatformRole(cookieJar({ [ALUM_SESSION_COOKIE]: lockerAlum }));
    assert.equal(role, "alum");
    assert.deepEqual(forYouComposableSections(role!), ["brothers"]);
  });

  it("lets Board post Brothers + Board, not Sgarlata", () => {
    const board = createAlumSessionToken({ role: "board", name: "Board" });
    const role = readPlatformRole(cookieJar({ [ALUM_SESSION_COOKIE]: board }));
    assert.equal(role, "board");
    assert.deepEqual(forYouComposableSections(role!), ["brothers", "board"]);
    assert.equal(canPostToFeedSection(role!, "sgarlata"), false);
  });

  it("lets coach ga_session admin post every For You section", () => {
    const staff = createSessionToken("Hoyas");
    const role = readPlatformRole(cookieJar({ [SESSION_COOKIE]: staff }));
    assert.equal(role, "admin");
    assert.deepEqual(forYouComposableSections(role!), ["brothers", "board", "sgarlata"]);
  });
});
