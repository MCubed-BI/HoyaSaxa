import { isValidEmail } from "@/lib/alumni-auth";

/** GU personal NetIDs are initials + digits; admin NetIDs allow up to 20 letters/digits. */
export const NET_ID_MIN_LENGTH = 2;
export const NET_ID_MAX_LENGTH = 20;
export const NET_ID_PATTERN = /^[a-z0-9]{2,20}$/;
export const GEORGETOWN_EMAIL_DOMAIN = "georgetown.edu";

export type AlumniLoginKind = "email" | "netId";

export type AlumniLoginIdentifier =
  | { kind: AlumniLoginKind; value: string }
  | { kind: "invalid" };

export function isGeorgetownEmail(value: string) {
  const trimmed = value.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return false;
  return trimmed.slice(at + 1).replace(/\.$/, "") === GEORGETOWN_EMAIL_DOMAIN;
}

/** Local-part of a @georgetown.edu address when it already looks like a NetID. */
export function netIdFromEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return null;
  if (!isGeorgetownEmail(trimmed)) return null;
  const local = trimmed.slice(0, at);
  return NET_ID_PATTERN.test(local) ? local : null;
}

export function prefillNetId(email?: string | null): string {
  if (!email) return "";
  return netIdFromEmail(email) ?? "";
}

export function normalizeNetId(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) throw new Error("Enter your GTown NetID.");
  if (trimmed.includes("@")) {
    const fromEmail = netIdFromEmail(trimmed);
    if (fromEmail) return fromEmail;
    throw new Error("Use the part before @georgetown.edu — for example, mak264.");
  }
  if (!NET_ID_PATTERN.test(trimmed)) {
    throw new Error("GTown NetID should be letters and numbers only (2–20 characters).");
  }
  return trimmed;
}

export function isValidNetId(value: string) {
  try {
    normalizeNetId(value);
    return true;
  } catch {
    return false;
  }
}

export function parseAlumniLoginIdentifier(raw: string): AlumniLoginIdentifier {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "invalid" };
  if (trimmed.includes("@")) {
    return isValidEmail(trimmed) ? { kind: "email", value: trimmed.toLowerCase() } : { kind: "invalid" };
  }
  const netId = trimmed.toLowerCase();
  return NET_ID_PATTERN.test(netId) ? { kind: "netId", value: netId } : { kind: "invalid" };
}

export function readAlumniLoginIdentifier(input: {
  email?: unknown;
  netId?: unknown;
  identifier?: unknown;
  username?: unknown;
}): string {
  for (const key of ["identifier", "email", "netId", "username"] as const) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function isNetIdUniqueConflict(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  if (code === "23505") {
    const message =
      error instanceof Error
        ? error.message
        : "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";
    return /alumni_accounts_net_id_lower|net_id/i.test(message) || !message;
  }
  const message = error instanceof Error ? error.message : "";
  return /alumni_accounts_net_id_lower|duplicate key value violates unique constraint/i.test(message);
}
