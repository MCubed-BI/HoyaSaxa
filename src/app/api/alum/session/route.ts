import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isVerifiedHoyaIdentity } from "@/lib/access";
import { ALUM_SESSION_COOKIE, isPreviewAlumSession, readAlumSession } from "@/lib/alum-session";
import { getDatabaseUrl } from "@/lib/db";
import { HOYA_ALUM_SESSION_COOKIE, readHoyaAlumSession } from "@/lib/hoya-alum-session";
import { alumModeCapabilities, resolvePlatformRole } from "@/lib/platform-roles";
import { lookupAssignedRole } from "@/lib/staff-roles";

async function assignedRoleFor(input: {
  alumniId?: string | null;
  email?: string | null;
  name?: string | null;
  username?: string | null;
}) {
  if (!getDatabaseUrl()) return null;
  try {
    return await lookupAssignedRole(input);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const session = readAlumSession(request);
  if (session) {
    const alumniId = isPreviewAlumSession(session) ? null : session.alumniId;
    const assignedRole = await assignedRoleFor({
      alumniId,
      email: session.email,
      name: session.name,
      username: session.name,
    });
    const mode = resolvePlatformRole({
      sessionRole: session.role,
      source: "alum-session",
      email: session.email,
      alumniId,
      name: session.name,
      username: session.name,
      assignedRole,
    });
    return NextResponse.json({
      session,
      mode,
      verifiedHoya: isVerifiedHoyaIdentity(session),
      ...alumModeCapabilities(mode),
    });
  }

  const jar = await cookies();
  const locker = readHoyaAlumSession(
    jar.get(ALUM_SESSION_COOKIE)?.value ?? jar.get(HOYA_ALUM_SESSION_COOKIE)?.value,
  );
  if (locker) {
    const assignedRole = await assignedRoleFor({ username: locker.label, name: locker.label });
    const mode = resolvePlatformRole({
      sessionRole: locker.role,
      source: "alum-session",
      username: locker.label,
      name: locker.label,
      assignedRole,
    });
    return NextResponse.json({
      session: { role: locker.role, name: locker.label, alumniId: null },
      mode,
      verifiedHoya: isVerifiedHoyaIdentity({ role: locker.role }),
      ...alumModeCapabilities(mode),
    });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
