import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  GMAIL_OAUTH_SCOPES,
  GMAIL_SEND_SCOPE,
  createGmailOAuthState,
  gmailOAuthClientConfigured,
  gmailOAuthRedirectUri,
  hasGmailSendScope,
  verifyGmailOAuthState,
} from "./gmail-oauth";

const KEYS = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_OAUTH_REDIRECT_URI"] as const;
const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("gmail oauth helpers", () => {
  it("requires client id and secret", () => {
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    assert.equal(gmailOAuthClientConfigured(), false);
    process.env.GMAIL_CLIENT_ID = "client.apps.googleusercontent.com";
    process.env.GMAIL_CLIENT_SECRET = "secret";
    assert.equal(gmailOAuthClientConfigured(), true);
  });

  it("round-trips signed oauth state", () => {
    const state = createGmailOAuthState();
    assert.equal(verifyGmailOAuthState(state), true);
    assert.equal(verifyGmailOAuthState("nope"), false);
    assert.equal(verifyGmailOAuthState(`${state}x`), false);
  });

  it("builds redirect uri from origin or env override", () => {
    delete process.env.GMAIL_OAUTH_REDIRECT_URI;
    assert.equal(
      gmailOAuthRedirectUri("https://georgetown-alum.vercel.app"),
      "https://georgetown-alum.vercel.app/api/gmail/oauth/callback",
    );
    process.env.GMAIL_OAUTH_REDIRECT_URI = "https://example.com/custom/callback";
    assert.equal(gmailOAuthRedirectUri("https://ignored.example"), "https://example.com/custom/callback");
  });

  it("requests gmail.send (not restricted full-mail) and detects send-capable scopes", () => {
    assert.match(GMAIL_OAUTH_SCOPES, new RegExp(GMAIL_SEND_SCOPE.replace(/\./g, "\\.")));
    assert.doesNotMatch(GMAIL_OAUTH_SCOPES, /mail\.google\.com/);
    assert.equal(hasGmailSendScope("openid email"), false);
    assert.equal(hasGmailSendScope(`openid ${GMAIL_SEND_SCOPE} email`), true);
    assert.equal(hasGmailSendScope("https://mail.google.com/"), true);
  });
});
