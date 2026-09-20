const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/alumni-login",
  "/home/login",
  "/locker",
  "/api/login",
  "/api/locker/login",
  "/api/locker/logout",
  "/api/messages/alum-session",
  "/api/alumni/lookup",
  "/api/alumni/register",
  "/api/alumni/login",
  "/api/alum/session",
  "/api/session",
  "/api/logout",
  "/giving",
  "/api/giving",
];

const ALUM_ALLOWED_PREFIXES = [
  "/portal",
  "/alum",
  "/home",
  "/feed",
  "/newsflash",
  "/board",
  "/brothers",
  "/sgarlata",
  "/messages",
  "/message",
  "/locker",
  "/fundraising",
  "/find-my-alum",
  "/me",
  "/directory",
  "/events",
  "/giving",
  "/athletes",
  "/api/portal",
  "/api/alumni",
  "/api/alum",
  "/api/locker",
  "/api/messages",
  "/api/events",
  "/api/giving",
  "/api/blast",
  "/api/feed",
  "/api/badges",
  "/api/admin",
  "/admin",
  "/api/logout",
];

export function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/manifest.webmanifest") {
    return true;
  }
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$/.test(pathname)) return true;
  return false;
}

export function isAlumAllowedPath(pathname: string) {
  return ALUM_ALLOWED_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** Staff admin may merge or permanently dismiss a duplicate pair. Photos use POST /api/alum/photos. */
export function isStaffAlumniMutationPath(pathname: string) {
  return pathname === "/api/alumni/merge" || pathname === "/api/alumni/dismiss-duplicate";
}

/** /me and claim APIs. Public register/lookup/login stay on PUBLIC_PATHS. */
export function isAlumniClaimPath(pathname: string) {
  return pathname === "/me" || pathname.startsWith("/me/") || pathname.startsWith("/api/alumni/");
}

/**
 * Claimed alum / locker / contract `hoya_alum_session` may open /me.
 * Do not require `ga_session`. Coach may only hit the staff merge path.
 */
export function canAccessAlumniClaimPath(
  pathname: string,
  input: { hasPortalAlumSession: boolean; isCoach?: boolean },
) {
  if (!isAlumniClaimPath(pathname)) return false;
  if (input.hasPortalAlumSession) return true;
  return Boolean(input.isCoach && isStaffAlumniMutationPath(pathname));
}

export function isDataSyncPath(pathname: string) {
  return pathname === "/sync" || pathname.startsWith("/sync/") || pathname.startsWith("/api/data-sync");
}

export function loginPathFor(pathname: string) {
  if (
    pathname === "/directory" ||
    pathname.startsWith("/directory/") ||
    pathname === "/athletes" ||
    pathname.startsWith("/athletes/")
  ) {
    return "/home/login";
  }
  if (
    pathname === "/home" ||
    pathname.startsWith("/home/") ||
    pathname === "/feed" ||
    pathname.startsWith("/feed/") ||
    pathname === "/events" ||
    pathname.startsWith("/events/") ||
    pathname === "/newsflash" ||
    pathname.startsWith("/newsflash/") ||
    pathname === "/board" ||
    pathname.startsWith("/board/") ||
    pathname === "/brothers" ||
    pathname.startsWith("/brothers/")
  ) {
    return "/home/login";
  }
  if (pathname === "/messages" || pathname.startsWith("/messages/") || pathname === "/locker") {
    return "/locker";
  }
  return isAlumAllowedPath(pathname) ? "/alumni-login" : "/login";
}
