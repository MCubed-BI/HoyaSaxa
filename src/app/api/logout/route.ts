import { NextResponse } from "next/server";
import {
  clearAllAuthCookies,
  hasAlumSessionCookieHeader,
  hasStaffSessionCookie,
  logoutRedirectPath,
  refererPathFromHeader,
  safeLogoutFromPath,
} from "@/lib/logout";

export const dynamic = "force-dynamic";

async function signOut(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const url = new URL(request.url);
  const formFrom =
    request.method === "POST"
      ? safeLogoutFromPath(String((await request.clone().formData().catch(() => new FormData())).get("from") ?? ""))
      : null;
  const next = logoutRedirectPath({
    from: formFrom ?? safeLogoutFromPath(url.searchParams.get("from")),
    refererPath: refererPathFromHeader(request.headers.get("referer"), request.url),
    hadStaffCookie: hasStaffSessionCookie(cookieHeader),
    hadAlumCookie: hasAlumSessionCookieHeader(cookieHeader),
  });
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  clearAllAuthCookies(response);
  return response;
}

export async function POST(request: Request) {
  return signOut(request);
}

export async function GET(request: Request) {
  return signOut(request);
}
