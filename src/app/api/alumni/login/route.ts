import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { alumSessionIdentityForAccount, authenticateAlumni } from "@/lib/alumni-claim";
import { setAlumSessionCookies } from "@/lib/session";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/me";
  if (value === "/login" || value.startsWith("/api/")) return "/me";
  return value;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { email?: string; password?: string };
      const account = await authenticateAlumni(body.email ?? "", body.password ?? "");
      const response = NextResponse.json({ ok: true, role: "alum", verifiedHoya: true, mode: "alum" });
      setAlumSessionCookies(response, await alumSessionIdentityForAccount(account));
      return response;
    }

    const form = await request.formData();
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const next = safeNextPath(typeof form.get("next") === "string" ? String(form.get("next")) : "/me");
    const account = await authenticateAlumni(email, password);
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
