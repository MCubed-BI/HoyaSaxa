import { NextResponse } from "next/server";
import {
  HOYA_ALUM_SESSION_COOKIE,
  alumniSessionCookieOptions,
  createAlumniSessionToken,
} from "@/lib/alumni-auth";
import { lockerAccountId, verifyAlumAccessCode } from "@/lib/messages-auth";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/messages";
  if (value.startsWith("/api/") || value === "/login") return "/messages";
  return value;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const code = String(form.get("access_code") ?? "");
  const next = safeNextPath(typeof form.get("next") === "string" ? String(form.get("next")) : "/messages");

  if (!verifyAlumAccessCode(code)) {
    const url = new URL("/locker", request.url);
    url.searchParams.set("error", "1");
    if (next !== "/messages") url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(
    HOYA_ALUM_SESSION_COOKIE,
    createAlumniSessionToken(lockerAccountId(email)),
    alumniSessionCookieOptions(),
  );
  return response;
}
