import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAlumLoggedIn } from "@/lib/alum-session";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { SESSION_COOKIE } from "@/lib/auth";
import { HOYA_ALUM_SESSION_COOKIE, isValidHoyaAlumSession } from "@/lib/hoya-alum-session";
import { clearCoachSessionCookies } from "@/lib/session";

export async function POST(request: Request) {
  const jar = await cookies();
  const remainingAlum = Boolean(
    isAlumLoggedIn(jar) ||
      isValidHoyaAlumSession(jar.get(HOYA_ALUM_SESSION_COOKIE)?.value) ||
      readAlumniSessionFromCookies((name) => jar.get(name)?.value),
  );
  const cookieHeader = request.headers.get("cookie") ?? "";
  const hadStaff = cookieHeader.split(";").some((part) => part.trim().startsWith(`${SESSION_COOKIE}=`));
  const response = NextResponse.redirect(new URL(hadStaff ? "/login" : "/locker", request.url), {
    status: 303,
  });
  clearCoachSessionCookies(response, remainingAlum);
  return response;
}
