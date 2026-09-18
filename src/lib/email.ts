function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const EMAIL_SEND_LIMIT = parsePositiveInt(process.env.EMAIL_SEND_LIMIT, 200);

export const RESEND_ENV_VARS = ["RESEND_API_KEY", "EMAIL_FROM"] as const;

export function emailFromAddress() {
  return process.env.EMAIL_FROM?.trim() || "";
}

export function emailReplyToAddress() {
  return process.env.EMAIL_REPLY_TO?.trim() || "";
}

export function missingResendEnv() {
  return RESEND_ENV_VARS.filter((name) => !process.env[name]?.trim());
}

export function emailConfigured() {
  return missingResendEnv().length === 0;
}

export function emailProvider(): "resend" | "sendgrid" | null {
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

export async function sendProviderEmail(to: string, subject: string, text: string): Promise<EmailSendResult> {
  const email = normalizeEmail(to);
  if (!email) return { email: to, status: "failed", error: "Invalid email" };

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
