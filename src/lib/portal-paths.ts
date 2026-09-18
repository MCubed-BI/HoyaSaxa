const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/alumni-login",
  "/home/login",
  "/directory",
  "/athletes",
  "/locker",
  "/api/login",
  "/api/locker/login",
  "/api/messages/alum-session",
  "/api/alumni/lookup",
  "/api/alumni/register",
  "/api/alumni/login",
  "/api/alum/session",
  "/api/session",
];

const ALUM_ALLOWED_PREFIXES = [
  "/portal",
  "/alum",
  "/home",
  "/feed",
  "/newsflash",
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
  "/api/logout",
];

export function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico" || pathname === "/robots.txt") return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)) return true;
  return false;
}

export function isAlumAllowedPath(pathname: string) {
  return ALUM_ALLOWED_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isDataSyncPath(pathname: string) {
  return pathname === "/sync" || pathname.startsWith("/sync/") || pathname.startsWith("/api/data-sync");
}

export function loginPathFor(pathname: string) {
  if (pathname === "/home" || pathname.startsWith("/home/") || pathname === "/feed" || pathname.startsWith("/feed/")) {
    return "/home/login";
  }
  if (pathname === "/messages" || pathname.startsWith("/messages/") || pathname === "/locker") {
    return "/locker";
  }
  return isAlumAllowedPath(pathname) ? "/alumni-login" : "/login";
}
