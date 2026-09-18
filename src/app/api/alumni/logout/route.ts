import { NextResponse } from "next/server";
import { ALUMNI_SESSION_COOKIE } from "@/lib/alumni-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/alumni-login", request.url), { status: 303 });
  response.cookies.set(ALUMNI_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
