import { NextResponse, type NextRequest } from "next/server";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
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

function isPublicPath(pathname: string) {
  return isHomePublicPath(pathname) || isMessagesPublicPath(pathname);
}

function isAlumFacingPath(pathname: string) {
  return isLockerPath(pathname) || isAlumAllowedPath(pathname);
}

function loginPathFor(pathname: string) {
  if (isLockerPath(pathname)) return lockerLoginPathFor(pathname);
  if (isAlumAllowedPath(pathname)) return messagesLoginPathFor(pathname);
  return "/login";
}

function hasAlumSession(request: NextRequest) {
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

  const staffToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (isValidSessionToken(staffToken)) {
    return NextResponse.next();
  }

  const alum = hasAlumSession(request);

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
