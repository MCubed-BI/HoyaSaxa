/**
 * Resolve platform role from the existing cookie contracts (no new cookies).
 */
import { ALUM_SESSION_COOKIE, getAlumSession, isAlumLoggedIn, type CookieJar } from "@/lib/alum-session";
import { SESSION_COOKIE, getSessionUsername, isValidSessionToken } from "@/lib/auth";
import { readHoyaAlumSession } from "@/lib/hoya-alum-session";
import {
  resolvePlatformRole,
  type PlatformIdentity,
  type PlatformRole,
} from "@/lib/platform-roles";

export function platformIdentityFromCookies(cookies: CookieJar): PlatformIdentity | null {
  const coachSession = isValidSessionToken(cookies.get(SESSION_COOKIE)?.value);
  const staffUsername = getSessionUsername(cookies.get(SESSION_COOKIE)?.value);
  const contract = getAlumSession(cookies);
  const locker = readHoyaAlumSession(cookies.get(ALUM_SESSION_COOKIE)?.value);

  if (!coachSession && !contract && !locker && !isAlumLoggedIn(cookies)) {
    return null;
  }

  return {
    coachSession,
    source: coachSession ? "ga_session" : contract || locker ? "hoya_alum_session" : null,
    sessionRole: staffUsername ? "coach" : (contract?.role ?? locker?.role ?? (isAlumLoggedIn(cookies) ? "alum" : null)),
    email: contract?.email ?? null,
    alumniId: contract?.alumniId ?? null,
    username: staffUsername ?? locker?.label ?? null,
    name: contract?.name ?? locker?.label ?? null,
  };
}

export function readPlatformRole(cookies: CookieJar): PlatformRole | null {
  const identity = platformIdentityFromCookies(cookies);
  return identity ? resolvePlatformRole(identity) : null;
}

export function identityFromViewer(viewer: {
  role: PlatformIdentity["sessionRole"];
  source?: PlatformIdentity["source"];
  email?: string | null;
  alumniId?: string | null;
  username?: string | null;
  label?: string | null;
}): PlatformIdentity {
  return {
    sessionRole: viewer.role,
    source: viewer.source ?? null,
    email: viewer.email ?? null,
    alumniId: viewer.alumniId ?? null,
    username: viewer.username ?? null,
    name: viewer.label ?? null,
    coachSession: viewer.source === "ga_session" || viewer.source === "staff",
  };
}
