import { NextResponse } from "next/server";
import { isVerifiedHoyaIdentity } from "@/lib/access";
import { readAlumSession } from "@/lib/alum-session";
import { resolvePlatformRole } from "@/lib/platform-roles";

export async function GET(request: Request) {
  const session = readAlumSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    session,
    mode: resolvePlatformRole({
      sessionRole: session.role,
      source: "alum-session",
      email: session.email,
      alumniId: session.alumniId,
      name: session.name,
      username: session.name,
    }),
    verifiedHoya: isVerifiedHoyaIdentity(session),
  });
}
