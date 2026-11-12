import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  emailConfigured,
  emailFromAddress,
  emailProvider,
  gmailAuthErrorMessage,
  gmailConfigured,
  gmailUser,
  isGmailAuthError,
  missingGmailEnv,
} from "./email";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Gmail SMTP blast path", () => {
  it("selects gmail when GMAIL_USER and GMAIL_APP_PASSWORD are set", () => {
    process.env.GMAIL_USER = "georgetownfootball35@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "abcd efgh ijkl mnop";
    delete process.env.EMAIL_FROM;
    delete process.env.RESEND_API_KEY;
    delete process.env.SENDGRID_API_KEY;
    assert.equal(gmailConfigured(), true);
    assert.equal(emailProvider(), "gmail");
    assert.equal(emailConfigured(), true);
    assert.equal(gmailUser(), "georgetownfootball35@gmail.com");
    assert.equal(emailFromAddress(), "georgetownfootball35@gmail.com");
    assert.deepEqual(missingGmailEnv(), []);
  });

  it("normalizes GMAIL_USER to lowercase", () => {
    process.env.GMAIL_USER = "GeorgetownFootball35@Gmail.com";
    process.env.GMAIL_APP_PASSWORD = "abcdefghijklmnop";
    assert.equal(gmailUser(), "georgetownfootball35@gmail.com");
  });

  it("prefers Gmail SMTP over leftover Resend keys", () => {
    process.env.GMAIL_USER = "georgetownfootball35@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "app-password-here";
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "other@example.com";
    assert.equal(emailProvider(), "gmail");
  });

  it("falls back to compose when Gmail env is missing", () => {
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    delete process.env.RESEND_API_KEY;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.EMAIL_FROM;
    assert.equal(gmailConfigured(), false);
    assert.equal(emailProvider(), null);
    assert.deepEqual(missingGmailEnv(), ["GMAIL_USER", "GMAIL_APP_PASSWORD"]);
  });

  it("detects Gmail BadCredentials auth errors", () => {
    process.env.GMAIL_USER = "georgetownfootball35@gmail.com";
    assert.equal(
      isGmailAuthError(
        "Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to\n535 5.7.8  https://support.google.com/mail/?p=BadCredentials",
      ),
      true,
    );
    assert.equal(isGmailAuthError("Recipient address rejected"), false);
    assert.match(gmailAuthErrorMessage(), /georgetownfootball35@gmail\.com/);
    assert.match(gmailAuthErrorMessage(), /App Password/);
  });

  it("detects remapped Gmail auth errors used by the blast send loop", () => {
    process.env.GMAIL_USER = "georgetownfootball35@gmail.com";
    const remapped = gmailAuthErrorMessage();
    assert.equal(isGmailAuthError(remapped), true);
  });
});

