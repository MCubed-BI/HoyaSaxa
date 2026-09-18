import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getCoachCredentials } from "@/lib/auth";

/** Primary alum cookie for Messages. */
export const HOYA_ALUM_SESSION_COOKIE = "hoya_alum_session";
/** Register/Claim + portal PRs still mint this name — accept it too. */
export const LEGACY_ALUMNI_SESSION_COOKIE = "ga_alumni_session";
export const ALUMNI_SESSION_COOKIE = LEGACY_ALUMNI_SESSION_COOKIE;
export const ALUMNI_SESSION_COOKIES = [HOYA_ALUM_SESSION_COOKIE, LEGACY_ALUMNI_SESSION_COOKIE] as const;
export const ALUM_ROLE = "alum" as const;

function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = hmac("georgetown-alum-cmp", a);
  const right = hmac("georgetown-alum-cmp", b);
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function alumniSessionSecret() {
  if (process.env.ALUMNI_SESSION_SECRET?.trim()) {
    return process.env.ALUMNI_SESSION_SECRET.trim();
  }
  const { username, password } = getCoachCredentials();
  return hmac("georgetown-alum-alumni-session", `${username}:${password}:alumni`);
}

export function hashAlumniPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export function verifyAlumniPassword(password: string, stored: string) {
  const [scheme, saltB64, hashB64] = stored.split(":");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createAlumniSessionToken(accountId: string) {
  const issuedAt = Date.now().toString();
  const payload = `${ALUM_ROLE}.${accountId}.${issuedAt}`;
  return `${payload}.${hmac(alumniSessionSecret(), payload)}`;
}

export function readAlumniSessionAccountId(token: string | undefined | null) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length >= 4) {
    const signature = parts[parts.length - 1];
    const issuedAt = parts[parts.length - 2];
    const role = parts[0];
    const accountId = parts.slice(1, -2).join(".");
    if (role !== ALUM_ROLE || !accountId || !issuedAt || !signature) return null;
    const expected = hmac(alumniSessionSecret(), `${role}.${accountId}.${issuedAt}`);
    return safeEqual(signature, expected) ? accountId : null;
  }
  if (parts.length < 3) return null;
  const signature = parts.pop();
  const issuedAt = parts.pop();
  const accountId = parts.join(".");
  if (!accountId || !issuedAt || !signature) return null;
  const expected = hmac(alumniSessionSecret(), `${accountId}.${issuedAt}`);
  if (!safeEqual(signature, expected)) return null;
  return accountId;
}

export function isValidAlumniSessionToken(token: string | undefined | null) {
  return Boolean(readAlumniSessionAccountId(token));
}

export function readAlumniSessionFromCookies(getCookie: (name: string) => string | undefined | null) {
  for (const name of ALUMNI_SESSION_COOKIES) {
    const accountId = readAlumniSessionAccountId(getCookie(name));
    if (accountId) return { cookie: name, accountId };
  }
  return null;
}

export function alumniSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
