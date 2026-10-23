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

function parseGate(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "supporter") return "supporter" as const;
  if (raw === "admin") return "admin" as const;
  return "alum" as const;
}

function loginErrorRedirect(request: Request, next: string, gate: "alum" | "supporter" | "admin") {
  const url = new URL("/home/login", request.url);
  url.searchParams.set("error", "1");
  url.searchParams.set("gate", gate);
  if (next !== "/home") url.searchParams.set("next", next);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const gate = parseGate(form.get("gate"));
  const next = safeNextPath(typeof form.get("next") === "string" ? String(form.get("next")) : null);

  if (gate === "admin") {
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
    return loginErrorRedirect(request, next, gate);
  }

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

  if (gate === "alum") {
    const verified = verifyLockerCredentials(username, password);
    if (verified) {
      const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
      clearCoachSessionCookies(response, true);
      response.cookies.set(
        HOYA_ALUM_SESSION_COOKIE,
        createHoyaAlumSessionToken(verified.role, verified.label),
        hoyaAlumSessionCookieOptions(),
      );
      return response;
    }
  }

  try {
    const account = await authenticateAlumni(username, password, {
      expectPersonKind: gate === "supporter" ? "supporter" : "alum",
    });
    const dest = account.netId ? next : "/me";
    const response = NextResponse.redirect(new URL(dest, request.url), { status: 303 });
    clearCoachSessionCookies(response, true);
    setAlumSessionCookies(response, await alumSessionIdentityForAccount(account));
    return response;
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return loginErrorRedirect(request, next, gate);
    }
  }
  return loginErrorRedirect(request, next, gate);
}
