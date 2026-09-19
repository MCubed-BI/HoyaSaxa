import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  emailConfigured,
  emailFromAddress,
  emailProvider,
  gmailConfigured,
  missingGmailEnv,
} from "./email";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Gmail SMTP blast path", () => {
  it("selects gmail when GMAIL_USER and GMAIL_APP_PASSWORD are set", () => {
    process.env.GMAIL_USER = "hoyas@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "abcd efgh ijkl mnop";
    delete process.env.EMAIL_FROM;
    delete process.env.RESEND_API_KEY;
    delete process.env.SENDGRID_API_KEY;
    assert.equal(gmailConfigured(), true);
    assert.equal(emailProvider(), "gmail");
    assert.equal(emailConfigured(), true);
    assert.equal(emailFromAddress(), "hoyas@gmail.com");
    assert.deepEqual(missingGmailEnv(), []);
  });

  it("prefers Gmail SMTP over leftover Resend keys", () => {
    process.env.GMAIL_USER = "coach@hoyas.edu";
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
});
