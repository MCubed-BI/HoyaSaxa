import { NextResponse } from "next/server";
import { getBlastActor } from "@/lib/blast-auth";
import {
  GMAIL_OAUTH_STATE_COOKIE,
  buildGmailOAuthAuthUrl,
  createGmailOAuthState,
  gmailOAuthClientConfigured,
} from "@/lib/gmail-oauth";
import { gmailUser } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await getBlastActor();
  if (!actor || actor.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!gmailOAuthClientConfigured()) {
    return NextResponse.json(
      {
        error:
          "Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET on Vercel first (Google Cloud OAuth web client).",
      },
      { status: 503 },
    );
  }
  if (!gmailUser()) {
    return NextResponse.json(
      { error: "Set GMAIL_USER to the mailbox that should send blasts (e.g. georgetownfootball35@gmail.com)." },
      { status: 503 },
    );
  }

  const origin = new URL(request.url).origin;
  const state = createGmailOAuthState();
  const url = buildGmailOAuthAuthUrl(origin, state);
  const response = NextResponse.redirect(url);
  response.cookies.set(GMAIL_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
