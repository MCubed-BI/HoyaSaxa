import { NextResponse, type NextRequest } from "next/server";
import { isAlumLoggedIn, isCoachLoggedIn } from "@/lib/session";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { HOYA_ALUM_SESSION_COOKIE, isValidHoyaAlumSession } from "@/lib/hoya-alum-session";
import {
  isLockerPath,
  isPublicPath as isHomePublicPath,
  loginPathFor as lockerLoginPathFor,
} from "@/lib/locker-paths";
import {
  isAlumAllowedPath,
  isDataSyncPath,
  isPublicPath as isMessagesPublicPath,
  loginPathFor as messagesLoginPathFor,
} from "@/lib/messages-auth";

// Auth boundary: alum vs coach. Claim/register must call isAlumLoggedIn(cookies)
// from `@/lib/alum-session` (cookie `hoya_alum_session`, role `"alum"`).
// Same HMAC signer as GTown portal. Locker Home uses a locker-format token on
// the same cookie name. Do not use isCoachLoggedIn / `ga_session` for alum.

const CLAIM_PUBLIC_PATHS = [
  "/register",
  "/alumni-login",
  "/api/alumni/lookup",
  "/api/alumni/register",
  "/api/alumni/login",
  "/api/session",
];

function isClaimPublicPath(pathname: string) {
  return CLAIM_PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicPath(pathname: string) {
  return isHomePublicPath(pathname) || isMessagesPublicPath(pathname) || isClaimPublicPath(pathname);
}

function isAlumFacingPath(pathname: string) {
  return isLockerPath(pathname) || isAlumAllowedPath(pathname);
}

function isAlumniPath(pathname: string) {
  return pathname === "/me" || pathname.startsWith("/me/") || pathname.startsWith("/api/alumni/");
}

function loginPathFor(pathname: string) {
  if (isAlumniPath(pathname)) return "/alumni-login";
  if (isLockerPath(pathname)) return lockerLoginPathFor(pathname);
  if (isAlumAllowedPath(pathname)) return messagesLoginPathFor(pathname);
  return "/login";
}

function hasPortalAlumSession(request: NextRequest) {
  if (isValidHoyaAlumSession(request.cookies.get(HOYA_ALUM_SESSION_COOKIE)?.value)) {
    return true;
  }
  return Boolean(readAlumniSessionFromCookies((name) => request.cookies.get(name)?.value));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (isAlumniPath(pathname)) {
    if (isAlumLoggedIn(request.cookies)) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/alumni-login", request.url);
    const next = `${pathname}${search}`;
    if (next && next !== "/") loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  if (isCoachLoggedIn(request.cookies)) {
    return NextResponse.next();
  }

  const alum = hasPortalAlumSession(request);

  if (alum && isDataSyncPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/messages", request.url));
  }

  if (alum && isAlumFacingPath(pathname)) {
    return NextResponse.next();
  }

  if (alum && !isAlumFacingPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/messages", request.url));
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL(loginPathFor(pathname), request.url);
  const next = `${pathname}${search}`;
  if (next && next !== "/") {
    loginUrl.searchParams.set("next", next);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
