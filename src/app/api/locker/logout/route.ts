import { NextResponse } from "next/server";
import { HOYA_ALUM_SESSION_COOKIE } from "@/lib/hoya-alum-session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/home/login", request.url), { status: 303 });
  response.cookies.set(HOYA_ALUM_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
