/**
 * Shared alum session contract (claim PR + GTown portal).
 *
 * Cookie: `hoya_alum_session`
 * Flags:  httpOnly, Secure (production), SameSite=Lax
 * Value:  `${base64url(JSON)}.${hmac_sha256_hex}`
 * JSON:   { v:1, role:"alum"|"board", alumniId, email, name, exp }
 *
 * How portal checks “is alum logged in”:
 *   import { isAlumLoggedIn, getAlumSession } from "@/lib/alum-session";
 *   const alum = isAlumLoggedIn(await cookies());
 *   // or: getAlumSession(await cookies())?.role === "alum"
 *
 * Register myself / alumni login always set role `"alum"` (never `"board"`).
 * Do not use coach `ga_session`. This cookie must not unlock Data Sync,
 * owner blast, or other staff gates.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { getCoachCredentials } from "@/lib/auth";

export const ALUM_SESSION_COOKIE = "hoya_alum_session";
/** @deprecated Use ALUM_SESSION_COOKIE. Cleared on login/logout. */
export const LEGACY_ALUMNI_SESSION_COOKIE = "ga_alumni_session";
export const ALUMNI_SESSION_COOKIE = ALUM_SESSION_COOKIE;
export const ALUM_ROLE = "alum" as const;
export const BOARD_ROLE = "board" as const;
export const ALUM_SESSION_TTL_SEC = 60 * 60 * 24 * 14;

export type AlumSessionRole = typeof ALUM_ROLE | typeof BOARD_ROLE;

export type AlumSessionPayload = {
  v: 1;
  role: AlumSessionRole;
  alumniId: string;
  email: string;
  name: string;
  exp: number;
};

export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = hmac("georgetown-alum-cmp", a);
  const right = hmac("georgetown-alum-cmp", b);
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function alumSessionSecret() {
  if (process.env.HOYA_ALUM_SESSION_SECRET?.trim()) {
    return process.env.HOYA_ALUM_SESSION_SECRET.trim();
  }
  if (process.env.ALUMNI_SESSION_SECRET?.trim()) {
    return process.env.ALUMNI_SESSION_SECRET.trim();
  }
  const { username, password } = getCoachCredentials();
  return hmac("georgetown-alum-alumni-session", `${username}:${password}:alumni`);
}

function cookieValue(cookies: CookieReader, name: string) {
  return cookies.get(name)?.value;
}

export function createAlumSessionToken(input: {
  alumniId: string;
  email: string;
  name: string;
  role?: AlumSessionRole;
  ttlSec?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AlumSessionPayload = {
    v: 1,
    role: input.role ?? ALUM_ROLE,
    alumniId: input.alumniId,
    email: input.email,
    name: input.name,
    exp: now + (input.ttlSec ?? ALUM_SESSION_TTL_SEC),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${hmac(alumSessionSecret(), body)}`;
}

export function readAlumSession(token: string | undefined | null): AlumSessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!body || !signature) return null;
  if (!safeEqual(signature, hmac(alumSessionSecret(), body))) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const payload = parsed as Partial<AlumSessionPayload>;
  if (payload.v !== 1) return null;
  if (payload.role !== ALUM_ROLE && payload.role !== BOARD_ROLE) return null;
  if (typeof payload.alumniId !== "string" || !payload.alumniId) return null;
  if (typeof payload.email !== "string" || !payload.email) return null;
  if (typeof payload.name !== "string") return null;
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return {
    v: 1,
    role: payload.role,
    alumniId: payload.alumniId,
    email: payload.email,
    name: payload.name,
    exp: payload.exp,
  };
}

export function getAlumSession(cookies: CookieReader) {
  return readAlumSession(cookieValue(cookies, ALUM_SESSION_COOKIE));
}

/** Portal/auth-boundary: true only when `hoya_alum_session` verifies as role `alum`. */
export function isAlumLoggedIn(cookies: CookieReader) {
  return getAlumSession(cookies)?.role === ALUM_ROLE;
}

export function isValidAlumSessionToken(token: string | undefined | null) {
  return Boolean(readAlumSession(token));
}

export function alumSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ALUM_SESSION_TTL_SEC,
  };
}
