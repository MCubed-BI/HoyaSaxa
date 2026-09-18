import { NextResponse, type NextRequest } from "next/server";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { isAlumAllowedPath, isDataSyncPath, isPublicPath, loginPathFor } from "@/lib/messages-auth";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const staffToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (isValidSessionToken(staffToken)) {
    return NextResponse.next();
  }

  const alum = readAlumniSessionFromCookies((name) => request.cookies.get(name)?.value);

  if (alum && isDataSyncPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/messages", request.url));
  }

  if (alum && isAlumAllowedPath(pathname)) {
    return NextResponse.next();
  }

  if (alum && !isAlumAllowedPath(pathname)) {
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
