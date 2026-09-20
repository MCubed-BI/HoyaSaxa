import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCanEditAlumniPhotos,
  normalizePhotoUrl,
  parseAlumniPhotoPatch,
  preferredAlumniPhotoUrl,
} from "./alumni-photos";

describe("alumni photo fields", () => {
  it("accepts http(s) or site paths and rejects other schemes", () => {
    assert.equal(normalizePhotoUrl(" https://guhoyas.com/photo.jpg "), "https://guhoyas.com/photo.jpg");
    assert.equal(normalizePhotoUrl("/media/mike.jpg"), "/media/mike.jpg");
    assert.equal(normalizePhotoUrl(""), null);
    assert.equal(normalizePhotoUrl(null), null);
    assert.throws(() => normalizePhotoUrl("javascript:alert(1)"), /http/);
  });

  it("parses only the additive photo columns", () => {
    const patch = parseAlumniPhotoPatch({
      football_photo_url: "https://example.com/f.jpg",
      linkedin_photo_url: "",
      headline: "ignore me",
    });
    assert.deepEqual(patch, {
      football_photo_url: "https://example.com/f.jpg",
      linkedin_photo_url: null,
    });
  });

  it("prefers football headshot and does not invent a LinkedIn scrape", () => {
    assert.equal(
      preferredAlumniPhotoUrl({
        football_photo_url: " https://guhoyas.com/images/2024/8/23/a.jpg ",
        linkedin_photo_url: "https://example.com/li.jpg",
      }),
      "https://guhoyas.com/images/2024/8/23/a.jpg",
    );
    assert.equal(
      preferredAlumniPhotoUrl({ football_photo_url: null, linkedin_photo_url: "https://example.com/li.jpg" }),
      "https://example.com/li.jpg",
    );
    assert.equal(preferredAlumniPhotoUrl({ football_photo_url: "", linkedin_photo_url: "" }), null);
  });

  it("allows claimed self or admin only", () => {
    assert.doesNotThrow(() =>
      assertCanEditAlumniPhotos({ role: "alum", actorAlumniId: "aaa", targetAlumniId: "aaa" }),
    );
    assert.doesNotThrow(() => assertCanEditAlumniPhotos({ role: "admin", actorAlumniId: null, targetAlumniId: "bbb" }));
    assert.throws(
      () => assertCanEditAlumniPhotos({ role: "alum", actorAlumniId: "aaa", targetAlumniId: "bbb" }),
      /admin/,
    );
  });
});
