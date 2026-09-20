import { NextResponse } from "next/server";
import { isVerifiedHoyaIdentity } from "@/lib/access";
import { readAlumSession } from "@/lib/alum-session";
import { accessModeForRole } from "@/lib/roles";

export async function GET(request: Request) {
  const session = readAlumSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    session,
    mode: accessModeForRole(session.role),
    verifiedHoya: isVerifiedHoyaIdentity(session),
  });
}
