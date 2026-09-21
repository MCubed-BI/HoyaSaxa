import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  classifyPhotoInput,
  extractPublicPreviewImage,
  isUsableLinkedinPreviewUrl,
  planLinkedinPhotoSave,
  resetLinkedinPhotoCache,
  resolveLinkedinPreviewImage,
} from "./linkedin-photo";

const PROFILE = "https://www.linkedin.com/in/hoya";
const PREVIEW = "https://media.licdn.com/dms/image/v2/headshot.jpg";
const UPLOAD = "data:image/png;base64,iVBORw0KGgo=";

afterEach(() => {
  resetLinkedinPhotoCache();
});

describe("classifyPhotoInput", () => {
  it("separates uploads, pasted images, and LinkedIn profile URLs", () => {
    assert.deepEqual(classifyPhotoInput(""), { kind: "empty", value: null });
    assert.deepEqual(classifyPhotoInput(UPLOAD), { kind: "upload", value: UPLOAD });
    assert.deepEqual(classifyPhotoInput(" https://example.com/head.jpg "), {
      kind: "image",
      value: "https://example.com/head.jpg",
    });
    assert.deepEqual(classifyPhotoInput("www.linkedin.com/in/hoya"), {
      kind: "profile",
      value: "https://www.linkedin.com/in/hoya",
    });
  });
});

describe("extractPublicPreviewImage", () => {
  it("reads og:image and decodes entities", () => {
    assert.equal(
      extractPublicPreviewImage(
        `<meta property="og:image" content="https://media.licdn.com/dms/image/v2/a.jpg?e=1&amp;v=beta">`,
      ),
      "https://media.licdn.com/dms/image/v2/a.jpg?e=1&v=beta",
    );
  });

  it("falls back to twitter:image and JSON-LD", () => {
    assert.equal(
      extractPublicPreviewImage(
        `<meta name="twitter:image" content="https://media.licdn.com/dms/image/v2/tw.jpg">`,
      ),
      "https://media.licdn.com/dms/image/v2/tw.jpg",
    );
    assert.equal(
      extractPublicPreviewImage(
        `<script type="application/ld+json">{"@type":"Person","image":"${PREVIEW}"}</script>`,
      ),
      PREVIEW,
    );
  });

  it("rejects LinkedIn logos and profile page URLs", () => {
    assert.equal(
      extractPublicPreviewImage(
        `<meta property="og:image" content="https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca">`,
      ),
      null,
    );
    assert.equal(isUsableLinkedinPreviewUrl(PROFILE), null);
  });
});

describe("planLinkedinPhotoSave", () => {
  it("lets an explicit upload win and never fetches", () => {
    const plan = planLinkedinPhotoSave({
      existingPhoto: PREVIEW,
      existingProfileUrl: PROFILE,
      incomingPhoto: UPLOAD,
      incomingProfileUrl: PROFILE,
    });
    assert.equal(plan.fetchProfileUrl, null);
    assert.equal(plan.writePhoto, UPLOAD);
    assert.equal(plan.skipNotice?.status, "kept_upload");
  });

  it("auto-fills only when the photo slot is empty", () => {
    const empty = planLinkedinPhotoSave({
      existingPhoto: null,
      existingProfileUrl: PROFILE,
    });
    assert.equal(empty.fetchProfileUrl, PROFILE);
    assert.equal(empty.writePhoto, undefined);

    const existing = planLinkedinPhotoSave({
      existingPhoto: PREVIEW,
      existingProfileUrl: PROFILE,
      incomingPhoto: PREVIEW,
      incomingProfileUrl: PROFILE,
    });
    assert.equal(existing.fetchProfileUrl, null);
    assert.equal(existing.writePhoto, PREVIEW);
  });

  it("refreshes from LinkedIn even when a pasted image is already on file", () => {
    const plan = planLinkedinPhotoSave({
      existingPhoto: "https://example.com/old.jpg",
      existingProfileUrl: PROFILE,
      incomingPhoto: "https://example.com/old.jpg",
      refreshFromLinkedin: true,
    });
    assert.equal(plan.fetchProfileUrl, PROFILE);
    assert.equal(plan.keepPhotoOnFetchFailure, "https://example.com/old.jpg");
    assert.equal(plan.writePhoto, undefined);
  });

  it("does not overwrite an existing photo when a fetch is not requested", () => {
    const plan = planLinkedinPhotoSave({
      existingPhoto: UPLOAD,
      existingProfileUrl: null,
      incomingProfileUrl: PROFILE,
    });
    assert.equal(plan.fetchProfileUrl, null);
    assert.equal(plan.writePhoto, undefined);
    assert.equal(plan.keepPhotoOnFetchFailure, UPLOAD);
    assert.equal(plan.profileUrlToPersist?.url, PROFILE);
  });

  it("treats a pasted profile URL as a profile, not a photo", () => {
    const plan = planLinkedinPhotoSave({
      existingPhoto: null,
      existingProfileUrl: null,
      incomingPhoto: "linkedin.com/in/hoya",
    });
    assert.equal(plan.fetchProfileUrl, "https://linkedin.com/in/hoya");
    assert.equal(plan.profileUrlToPersist?.url, "https://linkedin.com/in/hoya");
    assert.equal(plan.profileUrlToPersist?.overwrite, false);
    assert.equal(plan.writePhoto, undefined);
  });
});

describe("resolveLinkedinPreviewImage", () => {
  it("extracts a public preview, caches the result, and times out", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return new Response(`<meta property="og:image" content="${PREVIEW}">`, {
        headers: { "content-type": "text/html" },
      });
    };

    const first = await resolveLinkedinPreviewImage(PROFILE, { fetch: fetchImpl, now: 1_000 });
    const second = await resolveLinkedinPreviewImage(PROFILE, { fetch: fetchImpl, now: 2_000 });
    assert.equal(first.imageUrl, PREVIEW);
    assert.equal(first.cached, false);
    assert.equal(second.imageUrl, PREVIEW);
    assert.equal(second.cached, true);
    assert.equal(calls, 1);

    const hung: typeof fetch = () => new Promise(() => {});
    const timedOut = await resolveLinkedinPreviewImage("https://www.linkedin.com/in/slow", {
      fetch: hung,
      timeoutMs: 20,
    });
    assert.equal(timedOut.imageUrl, null);
    assert.equal(timedOut.reason, "timeout");
  });
});
