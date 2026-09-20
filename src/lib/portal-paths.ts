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

/** Staff admin may merge duplicates on this claim-adjacent API only. Photos use POST /api/alum/photos. */
export function isStaffAlumniMutationPath(pathname: string) {
  return pathname === "/api/alumni/merge";
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
    return "/login";
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
