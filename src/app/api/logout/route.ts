import { NextResponse } from "next/server";
import { ALUMNI_SESSION_COOKIES } from "@/lib/alumni-auth";
import { ALUM_SESSION_COOKIE } from "@/lib/alum-session";
import { SESSION_COOKIE } from "@/lib/auth";
import { clearAlumSessionCookies, clearCoachSessionCookies } from "@/lib/session";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const hadStaff = cookieHeader.split(";").some((part) => part.trim().startsWith(`${SESSION_COOKIE}=`));
  const response = NextResponse.redirect(new URL(hadStaff ? "/login" : "/alumni-login", request.url), {
    status: 303,
  });
  clearCoachSessionCookies(response, false);
  clearAlumSessionCookies(response, false);
  response.cookies.set(ALUM_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  for (const name of ALUMNI_SESSION_COOKIES) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return response;
}
