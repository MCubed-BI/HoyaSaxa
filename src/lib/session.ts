import { ALUM_ROLE, ALUMNI_SESSION_COOKIE, alumniSessionCookieOptions, createAlumniSessionToken, isValidAlumniSessionToken } from "@/lib/alumni-auth";
import { COACH_ROLE, SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

export const SESSION_ROLE_COOKIE = "ga_role";
export type SessionRole = typeof ALUM_ROLE | typeof COACH_ROLE;

export type SessionInfo = {
  role: SessionRole | null;
  roles: SessionRole[];
  alum: boolean;
  coach: boolean;
};

function cookieValue(cookies: { get(name: string): { value: string } | undefined }, name: string) {
  return cookies.get(name)?.value;
}

export function readSessionInfo(cookies: { get(name: string): { value: string } | undefined }): SessionInfo {
  const roles: SessionRole[] = [];
  if (isValidAlumniSessionToken(cookieValue(cookies, ALUMNI_SESSION_COOKIE))) roles.push(ALUM_ROLE);
  if (isValidSessionToken(cookieValue(cookies, SESSION_COOKIE))) roles.push(COACH_ROLE);
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

export function setAlumSessionCookies(response: CookieSetter, accountId: string) {
  response.cookies.set(ALUMNI_SESSION_COOKIE, createAlumniSessionToken(accountId), alumniSessionCookieOptions());
  response.cookies.set(SESSION_ROLE_COOKIE, ALUM_ROLE, roleHintCookieOptions());
}

export function clearAlumSessionCookies(response: CookieSetter, remainingCoach: boolean) {
  response.cookies.set(ALUMNI_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
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
