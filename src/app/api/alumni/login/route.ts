import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { alumSessionIdentityForAccount, authenticateAlumni } from "@/lib/alumni-claim";
import { readAlumniLoginIdentifier } from "@/lib/alumni-net-id";
import { setAlumSessionCookies } from "@/lib/session";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/home";
  if (value === "/login" || value.startsWith("/api/")) return "/home";
  return value;
}

function nextAfterAlumniLogin(requested: string | null, netId: string | null) {
  const next = safeNextPath(requested);
  if (!netId && next !== "/me" && !next.startsWith("/me?")) return "/me";
  return next;
}

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
      const account = await authenticateAlumni(readAlumniLoginIdentifier(body), body.password ?? "");
      const response = NextResponse.json({
        ok: true,
        role: "alum",
        verifiedHoya: true,
        mode: "alum",
        netId: account.netId,
      });
      setAlumSessionCookies(response, await alumSessionIdentityForAccount(account));
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
    const requested = typeof form.get("next") === "string" ? String(form.get("next")) : "/me";
    const account = await authenticateAlumni(identifier, password);
    const next = nextAfterAlumniLogin(requested, account.netId);
    const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
    setAlumSessionCookies(response, await alumSessionIdentityForAccount(account));
    return response;
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      if (contentType.includes("application/json")) {
        return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
      }
      return NextResponse.redirect(new URL("/alumni-login?error=1", request.url), { status: 303 });
    }
    if (contentType.includes("application/json")) {
      const message = error instanceof Error ? error.message : "Sign in failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const url = new URL("/alumni-login", request.url);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, { status: 303 });
  }
}
