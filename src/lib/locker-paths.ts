const PUBLIC_PATHS = ["/login", "/api/login", "/home/login", "/api/locker/login"];

const LOCKER_PATHS = ["/home", "/feed", "/newsflash", "/api/locker"];

export function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico" || pathname === "/robots.txt") return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)) return true;
  return false;
}

export function isLockerPath(pathname: string) {
  return LOCKER_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function lockerLoginPath() {
  return "/home/login";
}

export function loginPathFor(pathname: string) {
  return isLockerPath(pathname) ? lockerLoginPath() : "/login";
}
