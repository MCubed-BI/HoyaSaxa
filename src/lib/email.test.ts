import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  emailConfigured,
  emailFromAddress,
  emailProvider,
  gmailAuthErrorMessage,
  gmailAuthMode,
  gmailConfigured,
  gmailUser,
  isGmailAuthError,
  missingGmailEnv,
  resolveEmailProvider,
} from "./email";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function clearEmailEnv() {
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_APP_PASSWORD;
  delete process.env.GMAIL_CLIENT_ID;
  delete process.env.GMAIL_CLIENT_SECRET;
  delete process.env.GMAIL_REFRESH_TOKEN;
  delete process.env.RESEND_API_KEY;
  delete process.env.SENDGRID_API_KEY;
  delete process.env.EMAIL_FROM;
}

describe("Gmail SMTP blast path", () => {
  it("selects gmail when GMAIL_USER and GMAIL_APP_PASSWORD are set", async () => {
    clearEmailEnv();
    process.env.GMAIL_USER = "georgetownfootball35@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "abcd efgh ijkl mnop";
    assert.equal(gmailConfigured(), true);
    assert.equal(emailProvider(), "gmail");
    assert.equal(await resolveEmailProvider(), "gmail");
    assert.equal(await gmailAuthMode(), "app_password");
    assert.equal(emailConfigured(), true);
    assert.equal(gmailUser(), "georgetownfootball35@gmail.com");
    assert.equal(emailFromAddress(), "georgetownfootball35@gmail.com");
    assert.deepEqual(missingGmailEnv(), []);
  });

  it("treats OAuth client as configured but not sendable until refresh token exists", async () => {
    clearEmailEnv();
    process.env.GMAIL_USER = "georgetownfootball35@gmail.com";
    process.env.GMAIL_CLIENT_ID = "client.apps.googleusercontent.com";
    process.env.GMAIL_CLIENT_SECRET = "secret";
    assert.equal(gmailConfigured(), true);
    assert.equal(emailProvider(), "gmail");
    assert.equal(await resolveEmailProvider(), null);
    assert.equal(await gmailAuthMode(), null);
  });

  it("uses OAuth refresh token when present", async () => {
    clearEmailEnv();
    process.env.GMAIL_USER = "georgetownfootball35@gmail.com";
    process.env.GMAIL_CLIENT_ID = "client.apps.googleusercontent.com";
    process.env.GMAIL_CLIENT_SECRET = "secret";
    process.env.GMAIL_REFRESH_TOKEN = "refresh-token";
    process.env.GMAIL_APP_PASSWORD = "should-not-win";
    assert.equal(await gmailAuthMode(), "oauth");
    assert.equal(await resolveEmailProvider(), "gmail");
  });

  it("does not fall back to App Password when OAuth client exists but is unlinked", async () => {
    clearEmailEnv();
    process.env.GMAIL_USER = "georgetownfootball35@gmail.com";
    process.env.GMAIL_CLIENT_ID = "client.apps.googleusercontent.com";
    process.env.GMAIL_CLIENT_SECRET = "secret";
    process.env.GMAIL_APP_PASSWORD = "stale-rejected-password";
    assert.equal(await gmailAuthMode(), null);
    assert.equal(await resolveEmailProvider(), null);
  });

  it("normalizes GMAIL_USER to lowercase", () => {
    clearEmailEnv();
    process.env.GMAIL_USER = "GeorgetownFootball35@Gmail.com";
    process.env.GMAIL_APP_PASSWORD = "abcdefghijklmnop";
    assert.equal(gmailUser(), "georgetownfootball35@gmail.com");
  });

  it("falls back to compose when Gmail env is missing", async () => {
    clearEmailEnv();
    assert.equal(gmailConfigured(), false);
    assert.equal(emailProvider(), null);
    assert.equal(await resolveEmailProvider(), null);
    assert.ok(missingGmailEnv().includes("GMAIL_CLIENT_ID"));
  });

  it("detects Gmail BadCredentials auth errors", () => {
    clearEmailEnv();
    process.env.GMAIL_USER = "georgetownfootball35@gmail.com";
    process.env.GMAIL_CLIENT_ID = "client";
    process.env.GMAIL_CLIENT_SECRET = "secret";
    assert.equal(
      isGmailAuthError(
        "Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to\n535 5.7.8  https://support.google.com/mail/?p=BadCredentials",
      ),
      true,
    );
    assert.equal(isGmailAuthError("Recipient address rejected"), false);
    assert.match(gmailAuthErrorMessage(), /Connect Gmail/);
  });
});
