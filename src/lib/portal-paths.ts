const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/alumni-login",
  "/api/login",
  "/api/alumni/lookup",
  "/api/alumni/register",
  "/api/alumni/login",
];

const ALUM_ALLOWED_PREFIXES = [
  "/alum",
  "/message",
  "/newsflash",
  "/fundraising",
  "/find-my-alum",
  "/me",
  "/api/portal",
  "/api/alumni",
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

export function loginPathFor(pathname: string) {
  return isAlumAllowedPath(pathname) ? "/alumni-login" : "/login";
}
