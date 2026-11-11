import { NextResponse } from "next/server";
import { getBlastActor } from "@/lib/blast-auth";
import { gmailAuthMode, gmailUser } from "@/lib/email";
import { gmailOAuthClientConfigured, resolveGmailRefreshToken } from "@/lib/gmail-oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getBlastActor();
  if (!actor || actor.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = await gmailAuthMode();
  const token = mode === "oauth" ? await resolveGmailRefreshToken() : null;

  return NextResponse.json({
    user: gmailUser() || null,
    clientConfigured: gmailOAuthClientConfigured(),
    mode,
    linkedEmail: token?.email || (mode === "app_password" ? gmailUser() : null),
    connectPath: "/api/gmail/oauth/start",
  });
}
