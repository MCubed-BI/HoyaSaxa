import { toE164 } from "@/lib/phone";

export const SMS_SEND_LIMIT = 200;

function env(name: string) {
  return process.env[name]?.trim() || "";
}

/** Account SID + Auth Token, or Account SID + API Key SID/Secret. */
export function twilioAuth() {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const fromRaw = env("TWILIO_FROM_NUMBER");
  const from = toE164(fromRaw) || fromRaw;
  const authToken = env("TWILIO_AUTH_TOKEN");
  const apiKeySid = env("TWILIO_API_KEY_SID");
  const apiKeySecret = env("TWILIO_API_KEY_SECRET");

  if (!accountSid || !from) return null;
  if (authToken) {
    return { accountSid, from, username: accountSid, password: authToken, mode: "auth_token" as const };
  }
  if (apiKeySid && apiKeySecret) {
    return { accountSid, from, username: apiKeySid, password: apiKeySecret, mode: "api_key" as const };
  }
  return null;
}

export function twilioConfigured() {
  return Boolean(twilioAuth());
}

export type TwilioSendResult = {
  phone: string;
  status: "sent" | "failed";
  error?: string;
  sid?: string;
};

export async function sendTwilioMessage(to: string, body: string): Promise<TwilioSendResult> {
  const auth = twilioAuth();
  if (!auth) {
    return { phone: to, status: "failed", error: "Twilio is not configured" };
  }

  const normalized = toE164(to);
  if (!normalized) {
    return { phone: to, status: "failed", error: "Invalid phone number" };
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${auth.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: auth.from,
        To: normalized,
        Body: body,
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
    error_message?: string;
  };
  if (!response.ok) {
    return {
      phone: normalized,
      status: "failed",
      error: payload.message || payload.error_message || `Twilio ${response.status}`,
    };
  }
  return { phone: normalized, status: "sent", sid: payload.sid };
}
