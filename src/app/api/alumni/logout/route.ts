import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { clearAlumSessionCookies } from "@/lib/session";

export async function POST(request: Request) {
  const jar = await cookies();
  const remainingCoach = isValidSessionToken(jar.get(SESSION_COOKIE)?.value);
  const response = NextResponse.redirect(new URL("/alumni-login", request.url), { status: 303 });
  clearAlumSessionCookies(response, remainingCoach);
  return response;
}
