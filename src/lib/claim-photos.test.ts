import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyClaimPhotos,
  hasClaimPhotoValues,
  isClaimPhotoValidateStep,
  photoPatchFromRegisterBody,
  photosFromClaimMatch,
  profileUrlFromRegisterBody,
} from "./claim-photos";

describe("claim / register photo helpers", () => {
  it("prefills farmed football_photo_url and leaves an empty LinkedIn slot", () => {
    assert.deepEqual(
      photosFromClaimMatch({
        football_photo_url: " https://guhoyas.com/images/kasten.jpg ",
        linkedin_photo_url: null,
        linkedin_url: "www.linkedin.com/in/hoya",
      }),
      {
        football_photo_url: "https://guhoyas.com/images/kasten.jpg",
        linkedin_photo_url: "",
        linkedin_url: "www.linkedin.com/in/hoya",
      },
    );
    assert.deepEqual(photosFromClaimMatch(null), emptyClaimPhotos());
  });

  it("opens the validate / photos step from claim query flags", () => {
    assert.equal(isClaimPhotoValidateStep("1"), true);
    assert.equal(isClaimPhotoValidateStep("photos"), true);
    assert.equal(isClaimPhotoValidateStep("validate"), true);
    assert.equal(isClaimPhotoValidateStep(undefined, "PHOTOS"), true);
    assert.equal(isClaimPhotoValidateStep("no"), false);
    assert.equal(isClaimPhotoValidateStep(undefined, null), false);
  });

  it("does not wipe an existing roster photo when register body omits or blanks a slot", () => {
    assert.deepEqual(
      photoPatchFromRegisterBody({
        football_photo_url: "https://example.com/new.jpg",
        linkedin_photo_url: "https://example.com/head.jpg",
        headline: "ignore",
      }),
      {
        football_photo_url: "https://example.com/new.jpg",
        linkedin_photo_url: "https://example.com/head.jpg",
      },
    );
    assert.deepEqual(
      photoPatchFromRegisterBody({
        football_photo_url: "https://example.com/new.jpg",
        linkedin_photo_url: "   ",
      }),
      { football_photo_url: "https://example.com/new.jpg" },
    );
    assert.deepEqual(photoPatchFromRegisterBody({}), {});
    assert.deepEqual(
      photoPatchFromRegisterBody({
        linkedin_photo_url: "https://www.linkedin.com/in/hoya",
      }),
      {},
    );
    assert.equal(hasClaimPhotoValues({ football_photo_url: "", linkedin_photo_url: "", linkedin_url: "" }), false);
    assert.equal(hasClaimPhotoValues({ football_photo_url: "https://x", linkedin_photo_url: "", linkedin_url: "" }), true);
    assert.equal(
      profileUrlFromRegisterBody({ linkedin_url: "www.linkedin.com/in/hoya" }),
      "https://www.linkedin.com/in/hoya",
    );
    assert.equal(
      profileUrlFromRegisterBody({ linkedin_photo_url: "https://www.linkedin.com/in/hoya" }),
      "https://www.linkedin.com/in/hoya",
    );
  });
});
