import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { HOYA_ALUM_SESSION_COOKIE, isValidHoyaAlumSession } from "@/lib/hoya-alum-session";
import { isLockerPath, isPublicPath, loginPathFor } from "@/lib/locker-paths";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const staffToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (isValidSessionToken(staffToken)) {
    return NextResponse.next();
  }

  const lockerToken = request.cookies.get(HOYA_ALUM_SESSION_COOKIE)?.value;
  if (isValidHoyaAlumSession(lockerToken)) {
    if (isLockerPath(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/home", request.url));
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
