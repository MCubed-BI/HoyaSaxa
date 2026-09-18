import { createHmac, timingSafeEqual } from "crypto";
import { DEFAULT_COACH_PASSWORD, getCoachCredentials } from "@/lib/auth";

export const HOYA_ALUM_SESSION_COOKIE = "hoya_alum_session";
export const LOCKER_ROLES = ["alum", "board"] as const;
export type LockerRole = (typeof LOCKER_ROLES)[number];

export const DEFAULT_BOARD_USERNAME = "Lars";
export const DEFAULT_ALUM_USERNAME = "Alum";

export type HoyaAlumSession = {
  role: LockerRole;
  label: string;
  iat: number;
};

function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = hmac("georgetown-alum-cmp", a);
  const right = hmac("georgetown-alum-cmp", b);
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function parseCsv(value: string | undefined | null) {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

function uniqueUsernames(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function lockerBoardUsernames() {
  const listed = parseCsv(process.env.HOYA_BOARD_USERNAMES);
  return uniqueUsernames(listed.length ? listed : [DEFAULT_BOARD_USERNAME]);
}

export function lockerAlumUsernames() {
  const listed = parseCsv(process.env.HOYA_ALUM_USERNAMES);
  return uniqueUsernames(listed.length ? listed : [DEFAULT_ALUM_USERNAME]);
}

function lockerPassword(kind: LockerRole) {
  if (kind === "board" && process.env.HOYA_BOARD_PASSWORD) {
    return process.env.HOYA_BOARD_PASSWORD;
  }
  if (kind === "alum" && process.env.HOYA_ALUM_PASSWORD) {
    return process.env.HOYA_ALUM_PASSWORD;
  }
  if (process.env.HOYA_LOCKER_PASSWORD) {
    return process.env.HOYA_LOCKER_PASSWORD;
  }
  return getCoachCredentials().password || DEFAULT_COACH_PASSWORD;
}

function findUsername(username: string, list: string[]) {
  const needle = username.trim().toLowerCase();
  return list.find((item) => item.toLowerCase() === needle) ?? null;
}

export function isLockerRole(value: string | null | undefined): value is LockerRole {
  return Boolean(value && (LOCKER_ROLES as readonly string[]).includes(value));
}

export function canPostNewsflash(role: LockerRole | "coach" | null | undefined) {
  return role === "board";
}

function sessionSecret() {
  if (process.env.HOYA_ALUM_SESSION_SECRET?.trim()) {
    return process.env.HOYA_ALUM_SESSION_SECRET.trim();
  }
  const { username, password } = getCoachCredentials();
  return hmac("hoya-alum-session", `${username}:${password}:locker`);
}

function encodePayload(session: HoyaAlumSession) {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

function decodePayload(value: string): HoyaAlumSession | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<HoyaAlumSession>;
    if (!isLockerRole(parsed.role) || !parsed.label || typeof parsed.iat !== "number") {
      return null;
    }
    return { role: parsed.role, label: parsed.label, iat: parsed.iat };
  } catch {
    return null;
  }
}

export function createHoyaAlumSessionToken(role: LockerRole, label: string) {
  const session: HoyaAlumSession = {
    role,
    label: label.trim(),
    iat: Date.now(),
  };
  const payload = encodePayload(session);
  return `${payload}.${hmac(sessionSecret(), payload)}`;
}

export function readHoyaAlumSession(token: string | undefined | null): HoyaAlumSession | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = hmac(sessionSecret(), payload);
  if (!safeEqual(signature, expected)) return null;
  return decodePayload(payload);
}

export function isValidHoyaAlumSession(token: string | undefined | null) {
  return Boolean(readHoyaAlumSession(token));
}

export function verifyLockerCredentials(username: string, password: string) {
  const trimmed = username.trim();
  const boardName = findUsername(trimmed, lockerBoardUsernames());
  if (boardName && safeEqual(password, lockerPassword("board"))) {
    return { role: "board" as const, label: boardName };
  }
  const alumName = findUsername(trimmed, lockerAlumUsernames());
  if (alumName && safeEqual(password, lockerPassword("alum"))) {
    return { role: "alum" as const, label: alumName };
  }
  return null;
}

export function hoyaAlumSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}

export function lockerRoleLabel(role: LockerRole | "coach") {
  if (role === "board") return "Board";
  if (role === "coach") return "Staff";
  return "Alumnus";
}
