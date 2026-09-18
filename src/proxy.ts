import { NextResponse, type NextRequest } from "next/server";
import { ALUMNI_SESSION_COOKIE, isValidAlumniSessionToken } from "@/lib/alumni-auth";
import { ALUM_SESSION_COOKIE, readAlumSession } from "@/lib/alum-session";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { isAlumAllowedPath, isPublicPath, loginPathFor } from "@/lib/portal-paths";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const staffToken = request.cookies.get(SESSION_COOKIE)?.value;
  const hasStaff = isValidSessionToken(staffToken);
  const hasAlumContract = Boolean(readAlumSession(request.cookies.get(ALUM_SESSION_COOKIE)?.value ?? null));
  const hasLegacyAlumni = isValidAlumniSessionToken(request.cookies.get(ALUMNI_SESSION_COOKIE)?.value);
  const hasAlum = hasAlumContract || hasLegacyAlumni;

  if (hasStaff) {
    return NextResponse.next();
  }

  if (hasAlum && isAlumAllowedPath(pathname)) {
    return NextResponse.next();
  }

  if (hasAlum && !isAlumAllowedPath(pathname)) {
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
