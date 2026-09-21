import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { athletePhotoSlots, primaryPhotoUrl } from "./athlete-photo-slots";

describe("athlete photo slot mapping", () => {
  it("maps football_photo_url and linkedin_photo_url into roster + headshot slots", () => {
    const slots = athletePhotoSlots({
      football_photo_url: "https://example.com/roster.jpg",
      linkedin_photo_url: "https://example.com/head.jpg",
    });
    assert.deepEqual(
      slots.map((slot) => slot.id),
      ["roster", "headshot"],
    );
    assert.equal(slots[0]?.url, "https://example.com/roster.jpg");
    assert.equal(slots[1]?.url, "https://example.com/head.jpg");
    assert.equal(
      primaryPhotoUrl({
        footballPhotoUrl: "https://example.com/roster.jpg",
        linkedinPhotoUrl: null,
      }),
      "https://example.com/roster.jpg",
    );
    assert.equal(
      primaryPhotoUrl({
        football_photo_url: null,
        linkedin_photo_url: null,
        photoUrl: "https://example.com/legacy.jpg",
      }),
      "https://example.com/legacy.jpg",
    );
    assert.equal(
      primaryPhotoUrl({
        football_photo_url: "https://example.com/football.jpg",
        linkedin_photo_url: "https://example.com/li.jpg",
        photoUrl: "https://example.com/legacy.jpg",
      }),
      "https://example.com/football.jpg",
    );
  });
});
