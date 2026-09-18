import { NextResponse } from "next/server";
import { ALUMNI_SESSION_COOKIE } from "@/lib/alumni-auth";
import { ALUM_SESSION_COOKIE } from "@/lib/alum-session";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const hadStaff = cookie.split(";").some((part) => part.trim().startsWith(`${SESSION_COOKIE}=`));
  const response = NextResponse.redirect(new URL(hadStaff ? "/login" : "/alumni-login", request.url), {
    status: 303,
  });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(ALUM_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(ALUMNI_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
