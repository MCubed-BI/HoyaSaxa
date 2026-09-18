/**
 * Auth-boundary session helpers.
 *
 * How portal checks “is alum logged in”:
 *   import { isAlumLoggedIn } from "@/lib/alum-session";
 *   const alum = isAlumLoggedIn(await cookies());
 *
 * Canonical alum cookie lives in `src/lib/alum-session.ts`:
 *   - alum:  httpOnly `hoya_alum_session` — HMAC JSON `{ v:1, role:"alum"|"board", alumniId, email, name, exp }`
 *   - coach: httpOnly `ga_session` — staff gate; never treat as alum
 *   - hint:  readable `ga_role=alum|coach` for client chrome only (not authorization)
 *   - JSON:  GET /api/session → { role, roles, alum, coach }
 *
 * `isAlumLoggedIn` is the portal detect helper. `ga_role` is a hint, not proof.
 */
import {
  ALUM_ROLE,
  ALUM_SESSION_COOKIE,
  LEGACY_ALUMNI_SESSION_COOKIE,
  alumSessionCookieOptions,
  createAlumSessionToken,
  isAlumLoggedIn,
  type AlumSessionPayload,
  type CookieReader,
} from "@/lib/alum-session";
import { COACH_ROLE, SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

export { ALUM_ROLE, ALUM_SESSION_COOKIE, ALUMNI_SESSION_COOKIE, BOARD_ROLE, getAlumSession, isAlumLoggedIn } from "@/lib/alum-session";
export { COACH_ROLE, SESSION_COOKIE } from "@/lib/auth";

export const SESSION_ROLE_COOKIE = "ga_role";
export type SessionRole = typeof ALUM_ROLE | typeof COACH_ROLE;

export type SessionInfo = {
  role: SessionRole | null;
  roles: SessionRole[];
  alum: boolean;
  coach: boolean;
};

function cookieValue(cookies: CookieReader, name: string) {
  return cookies.get(name)?.value;
}

export function isCoachLoggedIn(cookies: CookieReader) {
  return isValidSessionToken(cookieValue(cookies, SESSION_COOKIE));
}

export function readSessionInfo(cookies: CookieReader): SessionInfo {
  const roles: SessionRole[] = [];
  if (isAlumLoggedIn(cookies)) roles.push(ALUM_ROLE);
  if (isCoachLoggedIn(cookies)) roles.push(COACH_ROLE);
  return {
    role: roles[0] ?? null,
    roles,
    alum: roles.includes(ALUM_ROLE),
    coach: roles.includes(COACH_ROLE),
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
  identity: Pick<AlumSessionPayload, "alumniId" | "email" | "name"> & { role?: AlumSessionPayload["role"] },
) {
  response.cookies.set(
    ALUM_SESSION_COOKIE,
    createAlumSessionToken({
      alumniId: identity.alumniId,
      email: identity.email,
      name: identity.name,
      role: identity.role ?? ALUM_ROLE,
    }),
    alumSessionCookieOptions(),
  );
  response.cookies.set(LEGACY_ALUMNI_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(SESSION_ROLE_COOKIE, ALUM_ROLE, roleHintCookieOptions());
}

export function clearAlumSessionCookies(response: CookieSetter, remainingCoach: boolean) {
  response.cookies.set(ALUM_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(LEGACY_ALUMNI_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  if (remainingCoach) {
    response.cookies.set(SESSION_ROLE_COOKIE, COACH_ROLE, roleHintCookieOptions());
  } else {
    response.cookies.set(SESSION_ROLE_COOKIE, "", { path: "/", maxAge: 0 });
  }
}

export function setCoachRoleHint(response: CookieSetter) {
  response.cookies.set(SESSION_ROLE_COOKIE, COACH_ROLE, roleHintCookieOptions());
}

export function clearCoachSessionCookies(response: CookieSetter, remainingAlum: boolean) {
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  if (remainingAlum) {
    response.cookies.set(SESSION_ROLE_COOKIE, ALUM_ROLE, roleHintCookieOptions());
  } else {
    response.cookies.set(SESSION_ROLE_COOKIE, "", { path: "/", maxAge: 0 });
  }
}
