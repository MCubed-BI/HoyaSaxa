import { NextResponse } from "next/server";
import { applyCentralLoginResponse } from "@/lib/apply-central-login";
import { authenticateCentralLogin } from "@/lib/central-login";

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const requestedNext = typeof form.get("next") === "string" ? String(form.get("next")) : null;

  try {
    const result = await authenticateCentralLogin(username, password);
    if (result.kind === "invalid") {
      const url = new URL("/login", request.url);
      url.searchParams.set("error", "1");
      if (requestedNext && requestedNext !== "/home") url.searchParams.set("next", requestedNext);
      return NextResponse.redirect(url, { status: 303 });
    }
    return applyCentralLoginResponse(request, result, requestedNext);
  } catch {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    if (requestedNext && requestedNext !== "/home") url.searchParams.set("next", requestedNext);
    return NextResponse.redirect(url, { status: 303 });
  }
}
