import { NextResponse } from "next/server";
import { applyCentralLoginResponse } from "@/lib/apply-central-login";
import {
  SESSION_COOKIE,
  createDbStaffSessionToken,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import { authenticateCentralLogin } from "@/lib/central-login";
import { readAlumniLoginIdentifier } from "@/lib/alumni-net-id";
import { isMissingDatabaseConfig } from "@/lib/db";
import {
  HOYA_ALUM_SESSION_COOKIE,
  createHoyaAlumSessionToken,
  hoyaAlumSessionCookieOptions,
} from "@/lib/hoya-alum-session";
import {
  clearAlumSessionCookies,
  clearCoachSessionCookies,
  setAlumSessionCookies,
  setCoachRoleHint,
} from "@/lib/session";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        email?: string;
        password?: string;
        identifier?: string;
        netId?: string;
        username?: string;
      };
      const result = await authenticateCentralLogin(
        readAlumniLoginIdentifier(body),
        body.password ?? "",
      );
      if (result.kind === "invalid") {
        return NextResponse.json(
          { error: "That username, Net ID, or password is not recognized." },
          { status: 401 },
        );
      }

      if (result.kind === "admin") {
        const response = NextResponse.json({
          ok: true,
          role: "admin",
          mode: "admin",
          verifiedHoya: Boolean(result.alumIdentity),
          username: result.username,
          netId: result.alumIdentity ? undefined : null,
        });
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
        const response = NextResponse.json({
          ok: true,
          role: "alum",
          verifiedHoya: true,
          mode: "alum",
          netId: result.account.netId,
        });
        clearCoachSessionCookies(response, true);
        setAlumSessionCookies(response, result.identity);
        return response;
      }

      const response = NextResponse.json({
        ok: true,
        role: result.role,
        mode: result.role,
        label: result.label,
      });
      clearCoachSessionCookies(response, true);
      response.cookies.set(
        HOYA_ALUM_SESSION_COOKIE,
        createHoyaAlumSessionToken(result.role, result.label),
        hoyaAlumSessionCookieOptions(),
      );
      return response;
    }

    const form = await request.formData();
    const identifier = readAlumniLoginIdentifier({
      identifier: form.get("identifier"),
      email: form.get("email"),
      netId: form.get("netId"),
      username: form.get("username"),
    });
    const password = String(form.get("password") ?? "");
    const requestedNext = typeof form.get("next") === "string" ? String(form.get("next")) : null;
    const result = await authenticateCentralLogin(identifier, password);
    if (result.kind === "invalid") {
      const url = new URL("/login", request.url);
      url.searchParams.set("error", "1");
      if (requestedNext && requestedNext !== "/") url.searchParams.set("next", requestedNext);
      return NextResponse.redirect(url, { status: 303 });
    }
    return applyCentralLoginResponse(request, result, requestedNext);
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      if (contentType.includes("application/json")) {
        return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
      }
      return NextResponse.redirect(new URL("/login?error=1", request.url), { status: 303 });
    }
    if (contentType.includes("application/json")) {
      const message = error instanceof Error ? error.message : "Sign in failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, { status: 303 });
  }
}
