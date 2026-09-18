import { toE164 } from "@/lib/phone";

export const SMS_SEND_LIMIT = 200;

export function twilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim(),
  );
}

export type TwilioSendResult = {
  phone: string;
  status: "sent" | "failed";
  error?: string;
  sid?: string;
};

export async function sendTwilioMessage(to: string, body: string): Promise<TwilioSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  const from = process.env.TWILIO_FROM_NUMBER!.trim();
  const normalized = toE164(to);
  if (!normalized) {
    return { phone: to, status: "failed", error: "Invalid phone number" };
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: from,
      To: normalized,
      Body: body,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as { sid?: string; message?: string };
  if (!response.ok) {
    return {
      phone: normalized,
      status: "failed",
      error: payload.message || `Twilio ${response.status}`,
    };
  }
  return { phone: normalized, status: "sent", sid: payload.sid };
}
