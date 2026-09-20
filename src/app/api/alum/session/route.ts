import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isVerifiedHoyaIdentity } from "@/lib/access";
import { ALUM_SESSION_COOKIE, readAlumSession } from "@/lib/alum-session";
import { HOYA_ALUM_SESSION_COOKIE, readHoyaAlumSession } from "@/lib/hoya-alum-session";
import { resolvePlatformRole } from "@/lib/platform-roles";

export async function GET(request: Request) {
  const session = readAlumSession(request);
  if (session) {
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

  const jar = await cookies();
  const locker = readHoyaAlumSession(
    jar.get(ALUM_SESSION_COOKIE)?.value ?? jar.get(HOYA_ALUM_SESSION_COOKIE)?.value,
  );
  if (locker) {
    return NextResponse.json({
      session: { role: locker.role, name: locker.label, alumniId: null },
      mode: resolvePlatformRole({
        sessionRole: locker.role,
        source: "alum-session",
        username: locker.label,
        name: locker.label,
      }),
      verifiedHoya: isVerifiedHoyaIdentity({ role: locker.role }),
    });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
