/**
 * Auth-boundary session helpers.
 *
 * How portal checks “is alum logged in”:
 *   import { isAlumLoggedIn } from "@/lib/alum-session";
 *   const alum = isAlumLoggedIn(await cookies());
 *
 * Canonical cookie lives in `src/lib/alum-session.ts` (same signer as GTown portal):
 *   - alum:  httpOnly `hoya_alum_session` — HMAC JSON `{ v:1, role:"alum"|"board", alumniId, email, name, exp }`
 *   - coach: httpOnly `ga_session` — staff gate; never treat as alum
 *   - hint:  readable `ga_role=alum|coach` for client chrome only (not authorization)
 *   - JSON:  GET /api/session → { role, roles, alum, coach }
 */
import {
  ALUM_ROLE,
  ALUM_SESSION_COOKIE,
  LEGACY_ALUMNI_SESSION_COOKIE,
  isAlumLoggedIn,
  setAlumSessionCookies as writePortalAlumCookie,
  type AlumRole,
  type CookieJar,
} from "@/lib/alum-session";
import { COACH_ROLE, SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { readPlatformRole } from "@/lib/platform-session";
import type { PlatformRole } from "@/lib/platform-roles";

export { ALUM_ROLE, ALUM_SESSION_COOKIE, ALUMNI_SESSION_COOKIE, BOARD_ROLE, getAlumSession, isAlumLoggedIn } from "@/lib/alum-session";
export { COACH_ROLE, SESSION_COOKIE } from "@/lib/auth";

export const SESSION_ROLE_COOKIE = "ga_role";
export type SessionRole = typeof ALUM_ROLE | typeof COACH_ROLE;

export type SessionInfo = {
  role: SessionRole | null;
  roles: SessionRole[];
  alum: boolean;
  coach: boolean;
  /** Myspace / feed stack. Additive — existing clients can ignore. */
  platformRole: PlatformRole | null;
  admin: boolean;
};

function cookieValue(cookies: CookieJar, name: string) {
  return cookies.get(name)?.value;
}

export function isCoachLoggedIn(cookies: CookieJar) {
  return isValidSessionToken(cookieValue(cookies, SESSION_COOKIE));
}

export function readSessionInfo(cookies: CookieJar): SessionInfo {
  const roles: SessionRole[] = [];
  if (isAlumLoggedIn(cookies)) roles.push(ALUM_ROLE);
  if (isCoachLoggedIn(cookies)) roles.push(COACH_ROLE);
  const platformRole = readPlatformRole(cookies);
  return {
    role: roles[0] ?? null,
    roles,
    alum: roles.includes(ALUM_ROLE),
    coach: roles.includes(COACH_ROLE),
    platformRole,
    admin: platformRole === "admin",
  };
}

export function roleHintCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}

type CookieSetter = {
  cookies: {
    set: (name: string, value: string, options?: Record<string, unknown>) => unknown;
  };
};

export function setAlumSessionCookies(
  response: CookieSetter,
  identity: { alumniId: string; email: string; name: string; role?: AlumRole },
) {
  writePortalAlumCookie(response, {
    role: identity.role ?? ALUM_ROLE,
    alumniId: identity.alumniId,
    email: identity.email,
    name: identity.name,
  });
  response.cookies.set(LEGACY_ALUMNI_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(SESSION_ROLE_COOKIE, ALUM_ROLE, roleHintCookieOptions());
}

export function expiredAuthCookieOptions(httpOnly = true) {
  return {
    httpOnly,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };
}

export function clearAlumSessionCookies(response: CookieSetter, remainingCoach: boolean) {
  const expired = expiredAuthCookieOptions();
  response.cookies.set(ALUM_SESSION_COOKIE, "", expired);
  response.cookies.set(LEGACY_ALUMNI_SESSION_COOKIE, "", expired);
  if (remainingCoach) {
    response.cookies.set(SESSION_ROLE_COOKIE, COACH_ROLE, roleHintCookieOptions());
  } else {
    response.cookies.set(SESSION_ROLE_COOKIE, "", expiredAuthCookieOptions(false));
  }
}

export function setCoachRoleHint(response: CookieSetter) {
  response.cookies.set(SESSION_ROLE_COOKIE, COACH_ROLE, roleHintCookieOptions());
}

export function clearCoachSessionCookies(response: CookieSetter, remainingAlum: boolean) {
  response.cookies.set(SESSION_COOKIE, "", expiredAuthCookieOptions());
  if (remainingAlum) {
    response.cookies.set(SESSION_ROLE_COOKIE, ALUM_ROLE, roleHintCookieOptions());
  } else {
    response.cookies.set(SESSION_ROLE_COOKIE, "", expiredAuthCookieOptions(false));
  }
}
