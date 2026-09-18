import { createHmac, timingSafeEqual } from "crypto";
import { allStaffUsernames } from "@/lib/roles";

export const SESSION_COOKIE = "ga_session";
export const COACH_ROLE = "coach" as const;
export const DEFAULT_COACH_USERNAME = "Hoyas";
export const DEFAULT_COACH_PASSWORD = "Sgarlata35";

export function getCoachCredentials() {
  return {
    username: process.env.COACH_USERNAME?.trim() || DEFAULT_COACH_USERNAME,
    password: process.env.COACH_PASSWORD || DEFAULT_COACH_PASSWORD,
  };
}

function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = hmac("georgetown-alum-cmp", a);
  const right = hmac("georgetown-alum-cmp", b);
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function sessionSecret() {
  const { username, password } = getCoachCredentials();
  return hmac("georgetown-alum-session", `${username}:${password}`);
}

function allowedStaffUsernames() {
  return allStaffUsernames(getCoachCredentials().username);
}

function isAllowedStaffUsername(username: string) {
  const needle = username.trim().toLowerCase();
  return allowedStaffUsernames().some((item) => item.toLowerCase() === needle);
}

function boardPassword() {
  return process.env.HOYA_BOARD_PASSWORD || getCoachCredentials().password;
}

export function createSessionToken(username?: string) {
  const staffUsername = (username?.trim() || getCoachCredentials().username).trim();
  const issuedAt = Date.now().toString();
  const payload = `${staffUsername}.${issuedAt}`;
  return `${payload}.${hmac(sessionSecret(), payload)}`;
}

export function readSessionUsername(token: string | undefined | null) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [username, issuedAt, signature] = parts;
  if (!username || !issuedAt || !signature) return null;
  const expected = hmac(sessionSecret(), `${username}.${issuedAt}`);
  if (!safeEqual(signature, expected)) return null;
  if (!isAllowedStaffUsername(username)) return null;
  return username;
}

export function getSessionUsername(token: string | undefined | null) {
  return readSessionUsername(token);
}

export function isValidSessionToken(token: string | undefined | null) {
  return Boolean(readSessionUsername(token));
}

export function verifyCredentials(username: string, password: string) {
  const trimmed = username.trim();
  if (!isAllowedStaffUsername(trimmed)) return false;
  const { password: coachPassword } = getCoachCredentials();
  const boardNames = (process.env.HOYA_BOARD_USERNAMES || "Lars")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const useBoardPassword = Boolean(process.env.HOYA_BOARD_PASSWORD) && boardNames.includes(trimmed.toLowerCase());
  return safeEqual(password, useBoardPassword ? boardPassword() : coachPassword);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}
