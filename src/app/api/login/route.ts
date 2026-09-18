import { NextResponse } from "next/server";
import {
  ALUM_SESSION_COOKIE,
  alumSessionCookieOptions,
  createAlumSessionToken,
} from "@/lib/alum-session";
import {
  SESSION_COOKIE,
  createSessionToken,
  getCoachCredentials,
  sessionCookieOptions,
  verifyCredentials,
} from "@/lib/auth";
import { homePathForRole, resolveRoleFromEnv } from "@/lib/roles";

function safeNextPath(value: string | null, roleHome: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return roleHome;
  return value;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const requestedNext = typeof form.get("next") === "string" ? String(form.get("next")) : null;

  if (!verifyCredentials(username, password)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    if (requestedNext && requestedNext !== "/") url.searchParams.set("next", requestedNext);
    return NextResponse.redirect(url, { status: 303 });
  }

  const role = resolveRoleFromEnv(username, getCoachCredentials().username);
  const next = safeNextPath(requestedNext, homePathForRole(role));
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });

  if (role === "alum" || role === "board") {
    response.cookies.set(
      ALUM_SESSION_COOKIE,
      createAlumSessionToken({
        role,
        email: "",
        name: username,
      }),
      alumSessionCookieOptions(),
    );
    return response;
  }

  response.cookies.set(SESSION_COOKIE, createSessionToken(username), sessionCookieOptions());
  return response;
}
