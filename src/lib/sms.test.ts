import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  formatTwilioDeliveryError,
  twilioAuth,
  twilioConfigured,
  twilioStatusToRecipientStatus,
} from "./sms";

const KEYS = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_API_KEY_SID",
  "TWILIO_API_KEY_SECRET",
  "TWILIO_FROM_NUMBER",
  "TWILIO_MESSAGING_SERVICE_SID",
] as const;

const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function clearTwilioEnv() {
  for (const key of KEYS) delete process.env[key];
}

describe("twilio auth", () => {
  it("is off when credentials are missing", () => {
    clearTwilioEnv();
    assert.equal(twilioConfigured(), false);
    assert.equal(twilioAuth(), null);
  });

  it("accepts Account SID + Auth Token + From", () => {
    clearTwilioEnv();
    process.env.TWILIO_ACCOUNT_SID = "ACxxxxxxxx";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_FROM_NUMBER = "+12025550100";
    assert.equal(twilioConfigured(), true);
    const auth = twilioAuth();
    assert.equal(auth?.mode, "auth_token");
    assert.equal(auth?.username, "ACxxxxxxxx");
    assert.equal(auth?.from, "+12025550100");
  });

  it("accepts Account SID + API Key SID/Secret + From (production shape)", () => {
    clearTwilioEnv();
    process.env.TWILIO_ACCOUNT_SID = "ACxxxxxxxx";
    process.env.TWILIO_API_KEY_SID = "SKyyyyyyyy";
    process.env.TWILIO_API_KEY_SECRET = "secret";
    process.env.TWILIO_FROM_NUMBER = "2025550100";
    assert.equal(twilioConfigured(), true);
    const auth = twilioAuth();
    assert.equal(auth?.mode, "api_key");
    assert.equal(auth?.username, "SKyyyyyyyy");
    assert.equal(auth?.password, "secret");
    assert.equal(auth?.from, "+12025550100");
  });

  it("accepts Messaging Service SID without From (A2P path)", () => {
    clearTwilioEnv();
    process.env.TWILIO_ACCOUNT_SID = "ACxxxxxxxx";
    process.env.TWILIO_API_KEY_SID = "SKyyyyyyyy";
    process.env.TWILIO_API_KEY_SECRET = "secret";
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MGzzzzzzzz";
    assert.equal(twilioConfigured(), true);
    assert.equal(twilioAuth()?.messagingServiceSid, "MGzzzzzzzz");
    assert.equal(twilioAuth()?.from, null);
  });

  it("prefers Auth Token when both token and API key are present", () => {
    clearTwilioEnv();
    process.env.TWILIO_ACCOUNT_SID = "ACxxxxxxxx";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_API_KEY_SID = "SKyyyyyyyy";
    process.env.TWILIO_API_KEY_SECRET = "secret";
    process.env.TWILIO_FROM_NUMBER = "+12025550100";
    assert.equal(twilioAuth()?.mode, "auth_token");
  });
});

describe("twilio delivery status mapping", () => {
  it("maps carrier outcomes so queued is not treated as delivered", () => {
    assert.equal(twilioStatusToRecipientStatus("queued"), "queued");
    assert.equal(twilioStatusToRecipientStatus("accepted"), "queued");
    assert.equal(twilioStatusToRecipientStatus("sent"), "sent");
    assert.equal(twilioStatusToRecipientStatus("delivered"), "sent");
    assert.equal(twilioStatusToRecipientStatus("undelivered"), "failed");
    assert.equal(twilioStatusToRecipientStatus("failed"), "failed");
  });

  it("formats undelivered carrier errors for blast UI", () => {
    assert.match(
      formatTwilioDeliveryError({ status: "undelivered", errorCode: 30003 }) ?? "",
      /30003/,
    );
    assert.match(
      formatTwilioDeliveryError({ status: "undelivered" }) ?? "",
      /landline|filtered|unreachable/i,
    );
  });
});
