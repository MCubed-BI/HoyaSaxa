import { firstValidE164, toE164 } from "@/lib/phone";

export const SMS_SEND_LIMIT = 200;

/** Terminal Twilio message statuses — delivery finished (success or not). */
const TERMINAL_STATUSES = new Set(["delivered", "undelivered", "failed", "canceled"]);

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function appBaseUrl() {
  const explicit = env("APP_URL") || env("NEXT_PUBLIC_APP_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  const production = env("VERCEL_PROJECT_PRODUCTION_URL");
  if (production) return `https://${production.replace(/^https?:\/\//, "")}`;
  const vercel = env("VERCEL_URL");
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "";
}

/** Account SID + Auth Token, or Account SID + API Key SID/Secret. */
export function twilioAuth() {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const fromRaw = env("TWILIO_FROM_NUMBER");
  const from = firstValidE164(fromRaw) || toE164(fromRaw) || fromRaw;
  const messagingServiceSid = env("TWILIO_MESSAGING_SERVICE_SID");
  const authToken = env("TWILIO_AUTH_TOKEN");
  const apiKeySid = env("TWILIO_API_KEY_SID");
  const apiKeySecret = env("TWILIO_API_KEY_SECRET");

  if (!accountSid) return null;
  if (!messagingServiceSid && !from) return null;

  const base = {
    accountSid,
    from: from || null,
    messagingServiceSid: messagingServiceSid || null,
  };

  if (authToken) {
    return { ...base, username: accountSid, password: authToken, mode: "auth_token" as const };
  }
  if (apiKeySid && apiKeySecret) {
    return { ...base, username: apiKeySid, password: apiKeySecret, mode: "api_key" as const };
  }
  return null;
}

export function twilioConfigured() {
  return Boolean(twilioAuth());
}

export type TwilioDeliveryStatus =
  | "queued"
  | "accepted"
  | "sending"
  | "sent"
  | "delivered"
  | "undelivered"
  | "failed"
  | "canceled";

export type TwilioSendResult = {
  phone: string;
  /** App-facing outcome after create (and optional settle). */
  status: "sent" | "failed" | "queued";
  /** Raw Twilio status when known. */
  providerStatus?: string;
  error?: string;
  errorCode?: number | string;
  sid?: string;
};

function mapCreateStatus(providerStatus: string | undefined, ok: boolean): TwilioSendResult["status"] {
  if (!ok) return "failed";
  const status = (providerStatus ?? "queued").toLowerCase();
  if (status === "delivered" || status === "sent") return "sent";
  if (status === "failed" || status === "undelivered" || status === "canceled") return "failed";
  return "queued";
}

function authHeader(auth: NonNullable<ReturnType<typeof twilioAuth>>) {
  return `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`;
}

export async function sendTwilioMessage(to: string, body: string): Promise<TwilioSendResult> {
  const auth = twilioAuth();
  if (!auth) {
    return { phone: to, status: "failed", error: "Twilio is not configured" };
  }

  const normalized = firstValidE164(to) ?? toE164(to);
  if (!normalized) {
    return { phone: to, status: "failed", error: "Invalid phone number" };
  }

  const params = new URLSearchParams({
    To: normalized,
    Body: body,
  });
  // Messaging Service is required for compliant US A2P 10DLC delivery on many carriers.
  if (auth.messagingServiceSid) {
    params.set("MessagingServiceSid", auth.messagingServiceSid);
  } else if (auth.from) {
    params.set("From", auth.from);
  }

  const base = appBaseUrl();
  if (base) {
    params.set("StatusCallback", `${base}/api/blast/twilio-status`);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${auth.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(auth),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    sid?: string;
    status?: string;
    message?: string;
    error_message?: string;
    error_code?: number | string;
    code?: number | string;
  };

  if (!response.ok) {
    return {
      phone: normalized,
      status: "failed",
      providerStatus: payload.status,
      error: payload.message || payload.error_message || `Twilio ${response.status}`,
      errorCode: payload.code ?? payload.error_code,
      sid: payload.sid,
    };
  }

  return {
    phone: normalized,
    status: mapCreateStatus(payload.status, true),
    providerStatus: payload.status,
    sid: payload.sid,
    error: payload.error_message || undefined,
    errorCode: payload.error_code,
  };
}

export async function fetchTwilioMessage(sid: string): Promise<{
  sid: string;
  status: string;
  error?: string;
  errorCode?: number | string;
  to?: string;
} | null> {
  const auth = twilioAuth();
  if (!auth || !sid.trim()) return null;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${auth.accountSid}/Messages/${encodeURIComponent(sid)}.json`,
    {
      headers: { Authorization: authHeader(auth) },
      cache: "no-store",
    },
  );
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as {
    sid?: string;
    status?: string;
    error_message?: string;
    error_code?: number | string;
    to?: string;
  } | null;
  if (!payload?.sid || !payload.status) return null;
  return {
    sid: payload.sid,
    status: payload.status,
    error: payload.error_message || undefined,
    errorCode: payload.error_code,
    to: payload.to,
  };
}

export function twilioStatusToRecipientStatus(providerStatus: string): "sent" | "failed" | "queued" {
  const status = providerStatus.toLowerCase();
  if (status === "delivered" || status === "sent") return "sent";
  if (status === "failed" || status === "undelivered" || status === "canceled") return "failed";
  return "queued";
}

export function formatTwilioDeliveryError(input: {
  status?: string;
  error?: string;
  errorCode?: number | string;
}) {
  const code = input.errorCode != null ? String(input.errorCode) : "";
  const status = (input.status ?? "").toLowerCase();
  if (code === "30034") {
    const from = twilioAuth()?.from;
    return (
      input.error ||
      `Twilio 30034: ${from ?? "From number"} is not on an approved US A2P 10DLC campaign. Set TWILIO_MESSAGING_SERVICE_SID to the Messaging Service that has this number in its Sender Pool.`
    );
  }
  if (input.error) {
    return code ? `${input.error} (Twilio ${code})` : input.error;
  }
  if (status === "undelivered") {
    return code
      ? `Undelivered by carrier (Twilio ${code})`
      : "Undelivered by carrier — number may be a landline, unreachable, or filtered";
  }
  if (status === "failed") {
    return code ? `Twilio send failed (${code})` : "Twilio send failed";
  }
  return undefined;
}

/** True when US A2P-safe sending is configured (Messaging Service preferred). */
export function twilioA2pReady() {
  const auth = twilioAuth();
  return Boolean(auth?.messagingServiceSid);
}

/**
 * Poll Twilio until each SID reaches a terminal status or maxWaitMs elapses.
 * Needed because Create Message returns queued/accepted long before carriers deliver —
 * the app previously marked those as "sent", which is why Danielle looked successful.
 */
export async function settleTwilioMessages(
  sids: string[],
  options?: { maxWaitMs?: number; intervalMs?: number },
): Promise<Map<string, { status: string; error?: string; errorCode?: number | string }>> {
  const maxWaitMs = options?.maxWaitMs ?? 12_000;
  const intervalMs = options?.intervalMs ?? 1_500;
  const pending = new Set(sids.filter(Boolean));
  const results = new Map<string, { status: string; error?: string; errorCode?: number | string }>();
  if (pending.size === 0) return results;

  const deadline = Date.now() + maxWaitMs;
  while (pending.size > 0 && Date.now() < deadline) {
    await Promise.all(
      [...pending].map(async (sid) => {
        const message = await fetchTwilioMessage(sid);
        if (!message) return;
        results.set(sid, {
          status: message.status,
          error: message.error,
          errorCode: message.errorCode,
        });
        if (TERMINAL_STATUSES.has(message.status.toLowerCase()) || message.status.toLowerCase() === "sent") {
          // "sent" means handed to the carrier; treat as settled for blast UX.
          pending.delete(sid);
        }
      }),
    );
    if (pending.size === 0) break;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return results;
}
