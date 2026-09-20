/**
 * Athlete-profile emails (signed-in locker only).
 * Directory / public cards stay contact-free — do not reuse this on list rows.
 */
const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAthleteEmail(value?: string | null) {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!text || !EMAIL_LIKE.test(text)) return null;
  return text;
}

export function collectAthleteEmails(
  primary?: string | null,
  extras: Array<{ email?: string | null } | string | null | undefined> = [],
) {
  const seen = new Set<string>();
  const emails: string[] = [];
  const push = (value?: string | null) => {
    const email = normalizeAthleteEmail(value);
    if (!email) return;
    const key = email.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    emails.push(email);
  };
  push(primary);
  for (const extra of extras) {
    push(typeof extra === "string" ? extra : extra?.email);
  }
  return emails;
}
