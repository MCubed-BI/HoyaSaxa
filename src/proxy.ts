import { NextResponse, type NextRequest } from "next/server";
import { allowRequest, resolveCookieAccess } from "@/lib/access";
import { ALUM_SESSION_COOKIE, isAlumLoggedIn, readAlumSession } from "@/lib/alum-session";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { HOYA_ALUM_SESSION_COOKIE, isValidHoyaAlumSession } from "@/lib/hoya-alum-session";
import { isLockerPath } from "@/lib/locker-paths";
import {
  isAlumAllowedPath,
  isDataSyncPath,
  isPublicPath,
  loginPathFor as portalLoginPathFor,
} from "@/lib/portal-paths";
import { isCoachLoggedIn } from "@/lib/session";

// Auth boundary: alum vs coach. Portal and claim call isAlumLoggedIn(cookies)
// from `@/lib/alum-session` (cookie `hoya_alum_session`, role `"alum"`).
// Same HMAC signer as GTown / Register myself. Locker Home may also mint a
// locker-format token on the same cookie name. Do not use ga_session for alum.

function isAlumniClaimPath(pathname: string) {
  return pathname === "/me" || pathname.startsWith("/me/") || pathname.startsWith("/api/alumni/");
}

function loginPathFor(pathname: string) {
  if (isAlumniClaimPath(pathname)) return "/alumni-login";
  return portalLoginPathFor(pathname);
}

function hasPortalAlumSession(request: NextRequest) {
  if (isAlumLoggedIn(request.cookies)) return true;
  const token =
    request.cookies.get(ALUM_SESSION_COOKIE)?.value ??
    request.cookies.get(HOYA_ALUM_SESSION_COOKIE)?.value ??
    null;
  if (readAlumSession(token) || isValidHoyaAlumSession(token)) return true;
  return Boolean(readAlumniSessionFromCookies((name) => request.cookies.get(name)?.value));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const access = resolveCookieAccess({
    get: (name) => request.cookies.get(name),
  });

  if (access && !allowRequest(access, pathname, request.method)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/messages/sgarlata", request.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (isAlumniClaimPath(pathname)) {
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
  const alumFacing = isAlumAllowedPath(pathname) || isLockerPath(pathname);

  if (alum && isDataSyncPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  if (alum && alumFacing) {
    return NextResponse.next();
  }

  if (alum && !alumFacing) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/portal", request.url));
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
