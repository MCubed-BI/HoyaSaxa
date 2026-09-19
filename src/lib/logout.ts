import { ALUMNI_SESSION_COOKIE, ALUM_SESSION_COOKIE, LEGACY_ALUMNI_SESSION_COOKIE } from "@/lib/alum-session";
import { SESSION_COOKIE } from "@/lib/auth";
import { isLockerPath } from "@/lib/locker-paths";
import { isAlumAllowedPath } from "@/lib/portal-paths";
import { expiredAuthCookieOptions } from "@/lib/session";

const CLAIM_PREFIXES = ["/me", "/alumni-login", "/register"];
const MESSAGES_PREFIXES = ["/messages", "/message", "/locker"];
const STAFF_PREFIXES = ["/", "/blast", "/reports", "/sync", "/alumni", "/fundraising", "/find-my-alum"];

export type LogoutContext = {
  from?: string | null;
  refererPath?: string | null;
  hadStaffCookie?: boolean;
  hadAlumCookie?: boolean;
};

type CookieSetter = {
  cookies: {
    set: (name: string, value: string, options?: Record<string, unknown>) => unknown;
  };
};

function startsWithPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function cookieHeaderHas(cookieHeader: string, name: string) {
  return cookieHeader.split(";").some((part) => {
    const trimmed = part.trim();
    return trimmed === `${name}=` || trimmed.startsWith(`${name}=`);
  });
}

export function hasStaffSessionCookie(cookieHeader: string) {
  return cookieHeaderHas(cookieHeader, SESSION_COOKIE);
}

export function hasAlumSessionCookieHeader(cookieHeader: string) {
  return (
    cookieHeaderHas(cookieHeader, ALUM_SESSION_COOKIE) ||
    cookieHeaderHas(cookieHeader, LEGACY_ALUMNI_SESSION_COOKIE) ||
    cookieHeaderHas(cookieHeader, ALUMNI_SESSION_COOKIE)
  );
}

export function safeLogoutFromPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  const pathname = value.split("?")[0] ?? value;
  if (!pathname.startsWith("/")) return null;
  return pathname;
}

export function refererPathFromHeader(referer: string | null | undefined, requestUrl: string) {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    const origin = new URL(requestUrl).origin;
    if (url.origin !== origin) return null;
    return safeLogoutFromPath(url.pathname);
  } catch {
    return null;
  }
}

export function isLockerSignOutPath(pathname: string) {
  return (
    isLockerPath(pathname) ||
    startsWithPath(pathname, "/directory") ||
    startsWithPath(pathname, "/athletes") ||
    startsWithPath(pathname, "/portal") ||
    startsWithPath(pathname, "/giving") ||
    startsWithPath(pathname, "/feed") ||
    startsWithPath(pathname, "/newsflash") ||
    startsWithPath(pathname, "/home")
  );
}

export function isMessagesSignOutPath(pathname: string) {
  return MESSAGES_PREFIXES.some((prefix) => startsWithPath(pathname, prefix));
}

export function isClaimSignOutPath(pathname: string) {
  return CLAIM_PREFIXES.some((prefix) => startsWithPath(pathname, prefix));
}

function isStaffSignOutPath(pathname: string) {
  if (isLockerSignOutPath(pathname) || isMessagesSignOutPath(pathname) || isClaimSignOutPath(pathname)) {
    return false;
  }
  return STAFF_PREFIXES.some((prefix) => startsWithPath(pathname, prefix));
}

export function logoutRedirectPath(input: LogoutContext) {
  const origin = safeLogoutFromPath(input.from) ?? safeLogoutFromPath(input.refererPath);
  if (origin) {
    if (isMessagesSignOutPath(origin)) return "/locker";
    if (isClaimSignOutPath(origin)) return "/alumni-login";
    if (isLockerSignOutPath(origin) || isAlumAllowedPath(origin)) return "/home/login";
    if (isStaffSignOutPath(origin)) return "/login";
  }

  if (input.hadAlumCookie) return "/home/login";
  if (input.hadStaffCookie) return "/login";
  return "/home/login";
}

export function clearAllAuthCookies(response: CookieSetter) {
  const httpOnly = expiredAuthCookieOptions(true);
  const readable = expiredAuthCookieOptions(false);
  response.cookies.set(SESSION_COOKIE, "", httpOnly);
  response.cookies.set(ALUM_SESSION_COOKIE, "", httpOnly);
  response.cookies.set(LEGACY_ALUMNI_SESSION_COOKIE, "", httpOnly);
  response.cookies.set("ga_role", "", readable);
}
