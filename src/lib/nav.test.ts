import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  alumPrimaryNavItems,
  brandHrefForRole,
  directoryHrefForRole,
  navItemsForRole,
  navKeyMatches,
  portalMoreItems,
  primaryNavItems,
  toolNavItems,
} from "./nav";

describe("unified application chrome", () => {
  it("gives Admin and Alum the same primary IA", () => {
    assert.deepEqual(
      primaryNavItems("alum").map((item) => item.label),
      ["For You", "Directory", "Events", "Giving", "Messages"],
    );
    assert.deepEqual(
      primaryNavItems("owner").map((item) => item.label),
      primaryNavItems("alum").map((item) => item.label),
    );
    assert.deepEqual(
      alumPrimaryNavItems().map((item) => item.href),
      ["/feed", "/directory", "/events", "/giving", "/messages"],
    );
    assert.equal(directoryHrefForRole("owner"), "/");
    assert.equal(directoryHrefForRole("coach"), "/");
    assert.equal(directoryHrefForRole("alum"), "/directory");
    assert.equal(directoryHrefForRole("board"), "/directory");
    assert.equal(brandHrefForRole("owner"), "/home");
    assert.equal(brandHrefForRole("alum"), "/home");
  });

  it("keeps operational tools in the same nav, gated by role", () => {
    const ownerTools = toolNavItems("owner").map((item) => item.label);
    assert.deepEqual(ownerTools, ["Find My Alum", "Reports", "Blast", "Data Sync", "Admin"]);
    assert.deepEqual(
      toolNavItems("alum").map((item) => item.label),
      ["Find My Alum", "Email classmates"],
    );
    assert.equal(
      navItemsForRole("owner").some((item) => item.label === "Alum view" || item.href === "/portal"),
      false,
    );
    assert.equal(
      navItemsForRole("alum").some((item) => item.href === "/reports" || item.href === "/sync" || item.href === "/admin"),
      false,
    );
    assert.equal(
      navItemsForRole("alum").some((item) => item.href === "/blast"),
      false,
    );
    assert.equal(
      portalMoreItems("owner").some((item) => item.label === "Admin portal"),
      false,
    );
  });

  it("treats legacy directory keys as the same Directory tab", () => {
    assert.equal(navKeyMatches("portal-directory", "directory"), true);
    assert.equal(navKeyMatches("directory", "directory"), true);
    assert.equal(navKeyMatches("profile", "directory"), true);
    assert.equal(navKeyMatches("feed", "directory"), false);
  });
});
