import { NextResponse, type NextRequest } from "next/server";
import { ALUMNI_SESSION_COOKIE, isValidAlumniSessionToken } from "@/lib/alumni-auth";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { isAlumAllowedPath, isPublicPath, loginPathFor } from "@/lib/portal-paths";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const staffToken = request.cookies.get(SESSION_COOKIE)?.value;
  const alumniToken = request.cookies.get(ALUMNI_SESSION_COOKIE)?.value;
  const hasStaff = isValidSessionToken(staffToken);
  const hasAlumni = isValidAlumniSessionToken(alumniToken);

  if (hasStaff) {
    return NextResponse.next();
  }

  if (hasAlumni && isAlumAllowedPath(pathname)) {
    return NextResponse.next();
  }

  if (hasAlumni && !isAlumAllowedPath(pathname)) {
    return NextResponse.redirect(new URL("/alum", request.url));
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
