import { NextResponse } from "next/server";
import { alumSessionIdentityForAccount, authenticateAlumni } from "@/lib/alumni-claim";
import {
  SESSION_COOKIE,
  createSessionToken,
  getCoachCredentials,
  sessionCookieOptions,
  verifyCredentials,
} from "@/lib/auth";
import { isMissingDatabaseConfig } from "@/lib/db";
import {
  HOYA_ALUM_SESSION_COOKIE,
  createHoyaAlumSessionToken,
  hoyaAlumSessionCookieOptions,
  verifyLockerCredentials,
} from "@/lib/hoya-alum-session";
import { isLockerPath } from "@/lib/locker-paths";
import { isAdminRole, resolveRoleFromEnv } from "@/lib/roles";
import {
  clearAlumSessionCookies,
  clearCoachSessionCookies,
  setAlumSessionCookies,
  setCoachRoleHint,
} from "@/lib/session";

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
  if (verifyCredentials(username, password)) {
    const role = resolveRoleFromEnv(username.trim(), getCoachCredentials().username);
    if (isAdminRole(role)) {
      const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
      clearAlumSessionCookies(response, true);
      response.cookies.set(SESSION_COOKIE, createSessionToken(username.trim()), sessionCookieOptions());
      setCoachRoleHint(response);
      return response;
    }
  }

  const verified = verifyLockerCredentials(username, password);

  if (!verified) {
    try {
      const account = await authenticateAlumni(username, password);
      const dest = account.netId ? next : "/me";
      const response = NextResponse.redirect(new URL(dest, request.url), { status: 303 });
      clearCoachSessionCookies(response, true);
      setAlumSessionCookies(response, await alumSessionIdentityForAccount(account));
      return response;
    } catch (error) {
      if (isMissingDatabaseConfig(error)) {
        const url = new URL("/home/login", request.url);
        url.searchParams.set("error", "1");
        if (next !== "/home") url.searchParams.set("next", next);
        return NextResponse.redirect(url, { status: 303 });
      }
    }
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
