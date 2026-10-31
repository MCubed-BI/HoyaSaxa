import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBlastActor } from "@/lib/blast-auth";
import { gmailUser } from "@/lib/email";
import {
  GMAIL_OAUTH_STATE_COOKIE,
  exchangeGmailOAuthCode,
  fetchGmailOAuthEmail,
  gmailOAuthClientConfigured,
  hasGmailSendScope,
  saveGmailOAuthTokens,
  verifyGmailOAuthState,
} from "@/lib/gmail-oauth";

export const dynamic = "force-dynamic";

function blastRedirect(origin: string, params: Record<string, string>) {
  const url = new URL("/blast", origin);
  url.searchParams.set("channel", "email");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const actor = await getBlastActor();
  if (!actor || actor.kind !== "staff") {
    return NextResponse.redirect(blastRedirect(origin, { gmail: "unauthorized" }));
  }
  if (!gmailOAuthClientConfigured()) {
    return NextResponse.redirect(blastRedirect(origin, { gmail: "missing_client" }));
  }

  const incoming = new URL(request.url);
  const error = incoming.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      blastRedirect(origin, { gmail: "denied", detail: error.slice(0, 80) }),
    );
  }

  const code = incoming.searchParams.get("code");
  const state = incoming.searchParams.get("state");
  const jar = await cookies();
  const cookieState = jar.get(GMAIL_OAUTH_STATE_COOKIE)?.value;

  if (!code || !verifyGmailOAuthState(state) || !cookieState || cookieState !== state) {
    return NextResponse.redirect(blastRedirect(origin, { gmail: "invalid_state" }));
  }

  const tokens = await exchangeGmailOAuthCode(origin, code);
  if (!tokens.access_token) {
    return NextResponse.redirect(
      blastRedirect(origin, {
        gmail: "token_error",
        detail: (tokens.error_description || tokens.error || "token").slice(0, 80),
      }),
    );
  }

  let email: string;
  try {
    email = await fetchGmailOAuthEmail(tokens.access_token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "userinfo";
    return NextResponse.redirect(
      blastRedirect(origin, { gmail: "userinfo_error", detail: message.slice(0, 80) }),
    );
  }

  const expected = gmailUser();
  if (expected && email !== expected) {
    return NextResponse.redirect(
      blastRedirect(origin, {
        gmail: "wrong_mailbox",
        detail: email,
        expected,
      }),
    );
  }

  if (!tokens.refresh_token) {
    return NextResponse.redirect(blastRedirect(origin, { gmail: "missing_refresh" }));
  }

  // Reject connects that only granted openid/email (common with restricted full-mail scope).
  if (tokens.scope && !hasGmailSendScope(tokens.scope)) {
    return NextResponse.redirect(
      blastRedirect(origin, {
        gmail: "missing_scope",
        detail: "Allow “Send email on your behalf”, then Connect Gmail again.",
      }),
    );
  }

  await saveGmailOAuthTokens({
    email,
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    expiresIn: tokens.expires_in,
  });

  const response = NextResponse.redirect(blastRedirect(origin, { gmail: "connected", from: email }));
  response.cookies.set(GMAIL_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
