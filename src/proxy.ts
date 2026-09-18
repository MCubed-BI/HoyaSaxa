import { NextResponse, type NextRequest } from "next/server";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { ALUM_SESSION_COOKIE, isAlumLoggedIn, readAlumSession } from "@/lib/alum-session";
import { isValidHoyaAlumSession } from "@/lib/hoya-alum-session";
import { isAlumAllowedPath, isDataSyncPath, isPublicPath, loginPathFor } from "@/lib/portal-paths";
import { isCoachLoggedIn } from "@/lib/session";

function isAlumniPath(pathname: string) {
  return pathname === "/me" || pathname.startsWith("/me/") || pathname.startsWith("/api/alumni/");
}

function hasPortalAlumSession(request: NextRequest) {
  const token = request.cookies.get(ALUM_SESSION_COOKIE)?.value ?? null;
  if (readAlumSession(token) || isValidHoyaAlumSession(token)) return true;
  return Boolean(readAlumniSessionFromCookies((name) => request.cookies.get(name)?.value));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (isAlumniPath(pathname)) {
    if (isAlumLoggedIn(request.cookies) || hasPortalAlumSession(request)) {
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
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  if (alum && isAlumAllowedPath(pathname)) {
    return NextResponse.next();
  }

  if (alum && !isAlumAllowedPath(pathname)) {
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
