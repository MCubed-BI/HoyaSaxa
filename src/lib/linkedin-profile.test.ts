import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  linkedinProfileFromRecord,
  linkedinProfileLabel,
  normalizeLinkedinProfileUrl,
  pickLinkedinProfileUrl,
} from "./linkedin-profile";

const MICHAEL = {
  id: "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136",
  first_name: "Michael",
  preferred_name: "Mr. Michael A. Kasten Jr.",
  last_name: "Kasten",
  full_name: "Michael Kasten",
  linkedin_url: null,
  linkedin_photo_url: "https://media.licdn.com/dms/image/headshot.jpg",
};

const MIKE_LINKEDIN = {
  id: "d88fa54e-e3e2-459e-a989-ff2f739d8c30",
  first_name: "Mike",
  last_name: "Kasten",
  full_name: "Mike Kasten",
  linkedin_url: "www.linkedin.com/in/mike-kasten-878ab348",
};

describe("linkedin profile URL (not the photo slot)", () => {
  it("normalizes a profile URL and rejects photo hosts", () => {
    assert.equal(
      normalizeLinkedinProfileUrl("www.linkedin.com/in/mike-kasten-878ab348"),
      "https://www.linkedin.com/in/mike-kasten-878ab348",
    );
    assert.equal(normalizeLinkedinProfileUrl("https://media.licdn.com/dms/image/headshot.jpg"), null);
    assert.equal(normalizeLinkedinProfileUrl("https://example.com/in/someone"), null);
    assert.equal(normalizeLinkedinProfileUrl(""), null);
  });

  it("reads linkedin_url / linkedinUrl and ignores linkedin_photo_url", () => {
    assert.equal(
      linkedinProfileFromRecord({
        linkedin_url: "https://www.linkedin.com/in/hoya",
        linkedin_photo_url: "https://media.licdn.com/dms/image/headshot.jpg",
      }),
      "https://www.linkedin.com/in/hoya",
    );
    assert.equal(
      linkedinProfileFromRecord({
        linkedinUrl: null,
        linkedin_photo_url: "https://media.licdn.com/dms/image/headshot.jpg",
        linkedinPhotoUrl: "https://example.com/head.jpg",
      }),
      null,
    );
    assert.equal(linkedinProfileLabel("https://www.linkedin.com/in/hoya"), "linkedin.com/in/hoya");
  });

  it("fills Mike athlete from the LinkedIn-import sibling and does not steal another Kasten", () => {
    assert.equal(
      pickLinkedinProfileUrl(MICHAEL, [MIKE_LINKEDIN]),
      "https://www.linkedin.com/in/mike-kasten-878ab348",
    );
    assert.equal(
      pickLinkedinProfileUrl(MICHAEL, [
        {
          id: "other",
          first_name: "John",
          last_name: "Kasten",
          linkedin_url: "https://www.linkedin.com/in/john-kasten",
        },
      ]),
      null,
    );
  });

  it("keeps the roster row URL when it already has one", () => {
    assert.equal(
      pickLinkedinProfileUrl(
        { ...MICHAEL, linkedin_url: "https://www.linkedin.com/in/michael-kasten" },
        [MIKE_LINKEDIN],
      ),
      "https://www.linkedin.com/in/michael-kasten",
    );
  });
});
