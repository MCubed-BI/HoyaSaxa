import { NextResponse } from "next/server";
import {
  HOYA_ALUM_SESSION_COOKIE,
  createHoyaAlumSessionToken,
  hoyaAlumSessionCookieOptions,
  verifyLockerCredentials,
} from "@/lib/hoya-alum-session";
import { isLockerPath } from "@/lib/locker-paths";
import { clearCoachSessionCookies } from "@/lib/session";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/home";
  if (value === "/home/login") return "/home";
  if (isLockerPath(value) || value === "/home") return value;
  return "/home";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const next = safeNextPath(typeof form.get("next") === "string" ? String(form.get("next")) : null);
  const verified = verifyLockerCredentials(username, password);

  if (!verified) {
    const url = new URL("/home/login", request.url);
    url.searchParams.set("error", "1");
    if (next !== "/home") url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  clearCoachSessionCookies(response, true);
  response.cookies.set(
    HOYA_ALUM_SESSION_COOKIE,
    createHoyaAlumSessionToken(verified.role, verified.label),
    hoyaAlumSessionCookieOptions(),
  );
  return response;
}
