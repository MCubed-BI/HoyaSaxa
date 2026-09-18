import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifyCredentials } from "@/lib/auth";
import { setCoachRoleHint } from "@/lib/session";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const next = safeNextPath(typeof form.get("next") === "string" ? String(form.get("next")) : null);

  if (!verifyCredentials(username, password)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
  setCoachRoleHint(response);
  return response;
}
