import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidAlumniSessionToken, readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { SESSION_COOKIE } from "@/lib/auth";
import { clearCoachSessionCookies } from "@/lib/session";

export async function POST(request: Request) {
  const jar = await cookies();
  const remainingAlum = Boolean(
    isValidAlumniSessionToken(jar.get("ga_alumni_session")?.value) ||
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
