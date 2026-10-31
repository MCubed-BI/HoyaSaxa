import nodemailer from "nodemailer";
import {
  gmailClientId,
  gmailClientSecret,
  gmailOAuthClientConfigured,
  resolveGmailRefreshToken,
} from "@/lib/gmail-oauth";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const EMAIL_SEND_LIMIT = parsePositiveInt(process.env.EMAIL_SEND_LIMIT, 200);
export const ALUM_EMAIL_SEND_LIMIT = parsePositiveInt(process.env.ALUM_EMAIL_SEND_LIMIT, 40);

export const GMAIL_ENV_VARS = ["GMAIL_USER", "GMAIL_APP_PASSWORD"] as const;
export const GMAIL_OAUTH_ENV_VARS = ["GMAIL_USER", "GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET"] as const;
export const RESEND_ENV_VARS = ["RESEND_API_KEY", "EMAIL_FROM"] as const;

export type EmailProvider = "gmail" | "resend" | "sendgrid";
export type GmailAuthMode = "oauth" | "app_password" | null;

export function gmailUser() {
  return process.env.GMAIL_USER?.trim().toLowerCase() || "";
}

export function gmailAppPassword() {
  return (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "").trim();
}

export function gmailAppPasswordConfigured() {
  return Boolean(gmailUser() && gmailAppPassword());
}

/** Sync hint: App Password set, or OAuth client present (mailbox may still need Connect Gmail). */
export function gmailConfigured() {
  return gmailAppPasswordConfigured() || gmailOAuthClientConfigured();
}

export function emailFromAddress() {
  return process.env.EMAIL_FROM?.trim() || gmailUser();
}

export function emailReplyToAddress() {
  return process.env.EMAIL_REPLY_TO?.trim() || "";
}

export function missingGmailEnv() {
  if (gmailAppPasswordConfigured()) return [];
  if (gmailOAuthClientConfigured() && gmailUser()) return [];
  if (gmailOAuthClientConfigured()) return ["GMAIL_USER"];
  return [...GMAIL_OAUTH_ENV_VARS];
}

export function missingResendEnv() {
  return RESEND_ENV_VARS.filter((name) => !process.env[name]?.trim());
}

export function emailConfigured() {
  return emailProvider() !== null;
}

/** Sync provider hint. Prefer `resolveEmailProvider` before sending. */
export function emailProvider(): EmailProvider | null {
  if (gmailAppPasswordConfigured()) return "gmail";
  if (gmailOAuthClientConfigured()) return "gmail";
  if (process.env.RESEND_API_KEY?.trim() && emailFromAddress()) return "resend";
  if (process.env.SENDGRID_API_KEY?.trim() && emailFromAddress()) return "sendgrid";
  return null;
}

/** True provider for live send: Gmail only when OAuth is linked or App Password is set. */
export async function resolveEmailProvider(): Promise<EmailProvider | null> {
  if (await gmailAuthMode()) return "gmail";
  if (process.env.RESEND_API_KEY?.trim() && emailFromAddress()) return "resend";
  if (process.env.SENDGRID_API_KEY?.trim() && emailFromAddress()) return "sendgrid";
  return null;
}

export function buildMailtoLink(emails: string[], subject: string, body: string) {
  const to = emails.filter(Boolean).slice(0, 30).join(",");
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return query ? `mailto:${to}?${query}` : `mailto:${to}`;
}

/** Compose fallback when Gmail SMTP env is not set. */
export function buildGmailComposeLink(emails: string[], subject: string, body: string) {
  const params = new URLSearchParams();
  params.set("view", "cm");
  params.set("fs", "1");
  const to = emails.filter(Boolean).slice(0, ALUM_EMAIL_SEND_LIMIT).join(",");
  if (to) params.set("to", to);
  if (subject) params.set("su", subject);
  if (body) params.set("body", body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export type EmailSendResult = {
  email: string;
  status: "sent" | "failed";
  error?: string;
  id?: string;
};

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

let cachedGmailTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let cachedGmailAuthKey: string | null = null;

type GmailTransportAuth =
  | { mode: "oauth"; refreshToken: string; email: string }
  | { mode: "app_password"; password: string; email: string };

async function resolveGmailTransportAuth(): Promise<GmailTransportAuth | null> {
  const user = gmailUser();
  if (gmailOAuthClientConfigured()) {
    const token = await resolveGmailRefreshToken();
    if (token?.refreshToken) {
      return {
        mode: "oauth",
        refreshToken: token.refreshToken,
        email: (token.email || user).toLowerCase(),
      };
    }
  }
  if (gmailAppPasswordConfigured() && user) {
    return { mode: "app_password", password: gmailAppPassword(), email: user };
  }
  return null;
}

export async function gmailAuthMode(): Promise<GmailAuthMode> {
  const auth = await resolveGmailTransportAuth();
  return auth?.mode ?? null;
}

function gmailAuthKey(auth: GmailTransportAuth) {
  if (auth.mode === "oauth") {
    return `oauth\0${auth.email}\0${auth.refreshToken}\0${gmailClientId()}`;
  }
  return `app\0${auth.email}\0${auth.password}`;
}

async function gmailTransporter() {
  const auth = await resolveGmailTransportAuth();
  if (!auth) return null;
  const key = gmailAuthKey(auth);
  if (!cachedGmailTransporter || cachedGmailAuthKey !== key) {
    if (auth.mode === "oauth") {
      cachedGmailTransporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          type: "OAuth2",
          user: auth.email || gmailUser(),
          clientId: gmailClientId(),
          clientSecret: gmailClientSecret(),
          refreshToken: auth.refreshToken,
        },
      });
    } else {
      cachedGmailTransporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: auth.email,
          pass: auth.password,
        },
      });
    }
    cachedGmailAuthKey = key;
  }
  return cachedGmailTransporter;
}

/** True when Google rejected the SMTP username/app password / OAuth token. */
export function isGmailAuthError(message: string | undefined) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid login") ||
    lower.includes("badcredentials") ||
    lower.includes("username and password not accepted") ||
    lower.includes("535-5.7.8") ||
    lower.includes("535 5.7.8") ||
    lower.includes("application-specific password required") ||
    lower.includes("please log in with your web browser") ||
    lower.includes("invalid_grant") ||
    lower.includes("unauthorized_client")
  );
}

export function gmailAuthErrorMessage() {
  const user = gmailUser() || "GMAIL_USER";
  if (gmailOAuthClientConfigured()) {
    return (
      `Gmail is not linked for ${user}. Staff: open Connect Gmail on /blast and sign in as that mailbox ` +
      `(OAuth — no App Password / 2-Step required).`
    );
  }
  return (
    `Gmail rejected login for ${user}. Prefer Connect Gmail (OAuth): set GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET, ` +
    `then sign in once as that mailbox. App Passwords also work if 2-Step Verification is enabled.`
  );
}

/**
 * Verify SMTP credentials once before a blast. Avoids hammering Google with the same
 * BadCredentials error for every recipient.
 */
export async function verifyGmailSmtp(): Promise<{ ok: true; mode: GmailAuthMode } | { ok: false; error: string }> {
  const auth = await resolveGmailTransportAuth();
  if (!auth) {
    if (gmailOAuthClientConfigured()) {
      return {
        ok: false,
        error: gmailAuthErrorMessage(),
      };
    }
    return { ok: false, error: "Gmail SMTP is not configured (Connect Gmail OAuth or GMAIL_APP_PASSWORD)" };
  }
  const transporter = await gmailTransporter();
  if (!transporter) {
    return { ok: false, error: "Gmail SMTP is not configured" };
  }
  try {
    await transporter.verify();
    return { ok: true, mode: auth.mode };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail SMTP verify failed";
    return { ok: false, error: isGmailAuthError(message) ? gmailAuthErrorMessage() : message };
  }
}

async function sendGmailEmail(email: string, subject: string, text: string): Promise<EmailSendResult> {
  const auth = await resolveGmailTransportAuth();
  const transporter = await gmailTransporter();
  const from = auth?.email || gmailUser();
  if (!transporter || !from) {
    return { email, status: "failed", error: "Gmail SMTP is not configured" };
  }
  try {
    const info = await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
      replyTo: emailReplyToAddress() || undefined,
    });
    return { email, status: "sent", id: typeof info.messageId === "string" ? info.messageId : undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail SMTP send failed";
    return {
      email,
      status: "failed",
      error: isGmailAuthError(message) ? gmailAuthErrorMessage() : message,
    };
  }
}

async function sendResendEmail(email: string, subject: string, text: string): Promise<EmailSendResult> {
  const from = emailFromAddress();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const replyTo = emailReplyToAddress();
  if (!from || !apiKey) {
    return { email, status: "failed", error: "Resend is not configured" };
  }

  const body: Record<string, unknown> = { from, to: [email], subject, text };
  if (replyTo) body.reply_to = replyTo;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok) {
    return { email, status: "failed", error: payload.message || `Resend ${response.status}` };
  }
  return { email, status: "sent", id: payload.id };
}

/** Staff `/blast` and alum `/portal/blast` both call this. Gmail SMTP wins when env is set. */
export async function sendProviderEmail(to: string, subject: string, text: string): Promise<EmailSendResult> {
  const email = normalizeEmail(to);
  if (!email) return { email: to, status: "failed", error: "Invalid email" };

  const provider = emailProvider();
  if (provider === "gmail") return sendGmailEmail(email, subject, text);
  if (provider === "resend") return sendResendEmail(email, subject, text);
  return {
    email,
    status: "failed",
    error: "Gmail SMTP is not configured (Connect Gmail OAuth or GMAIL_APP_PASSWORD)",
  };
}
