import { NextResponse } from "next/server";
import {
  HOYA_ALUM_SESSION_COOKIE,
  createHoyaAlumSessionToken,
  hoyaAlumSessionCookieOptions,
} from "@/lib/hoya-alum-session";
import {
  SESSION_COOKIE,
  createDbStaffSessionToken,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import type { CentralLoginSuccess } from "@/lib/central-login";
import { resolveCentralLoginNext } from "@/lib/central-login";
import {
  clearAlumSessionCookies,
  clearCoachSessionCookies,
  setAlumSessionCookies,
  setCoachRoleHint,
} from "@/lib/session";

/** Apply cookies + redirect for a successful central login. */
export function applyCentralLoginResponse(
  request: Request,
  result: CentralLoginSuccess,
  requestedNext: string | null,
) {
  const next = resolveCentralLoginNext(requestedNext, result);
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });

  if (result.kind === "admin") {
    clearAlumSessionCookies(response, true);
    const token =
      result.session === "db"
        ? createDbStaffSessionToken(result.username)
        : createSessionToken(result.username);
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    setCoachRoleHint(response);
    return response;
  }

  if (result.kind === "alum") {
    clearCoachSessionCookies(response, true);
    setAlumSessionCookies(response, result.identity);
    return response;
  }

  clearCoachSessionCookies(response, true);
  response.cookies.set(
    HOYA_ALUM_SESSION_COOKIE,
    createHoyaAlumSessionToken(result.role, result.label),
    hoyaAlumSessionCookieOptions(),
  );
  return response;
}
