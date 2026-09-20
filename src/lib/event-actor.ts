import { cookies } from "next/headers";
import { isPreviewAlumSession, parseAlumSessionToken } from "@/lib/alum-session";
import { SESSION_COOKIE } from "@/lib/auth";
import { getEventActorFromToken, type EventActor } from "@/lib/event-auth";
import { HOYA_ALUM_SESSION_COOKIE, readHoyaAlumSession } from "@/lib/hoya-alum-session";
import { resolvePlatformRole } from "@/lib/platform-roles";

/** Staff `ga_session` first, then contract or locker `hoya_alum_session`. */
export function eventActorFromTokens(input: {
  staffToken?: string | null;
  alumToken?: string | null;
}): EventActor | null {
  const staff = getEventActorFromToken(input.staffToken);
  if (staff) return staff;

  const contract = parseAlumSessionToken(input.alumToken);
  if (contract) {
    const alumId = isPreviewAlumSession(contract) ? null : contract.alumniId;
    const label = contract.name.trim() || contract.email.trim() || "Alumnus";
    return {
      username: label,
      role: contract.role,
      platformRole: resolvePlatformRole({
        sessionRole: contract.role,
        source: "hoya_alum_session",
        email: contract.email,
        alumniId: alumId,
        username: label,
        name: contract.name,
      }),
      alumId,
      userId: alumId ?? label,
    };
  }

  const locker = readHoyaAlumSession(input.alumToken);
  if (locker) {
    return {
      username: locker.label,
      role: locker.role,
      platformRole: resolvePlatformRole({
        sessionRole: locker.role,
        source: "hoya_alum_session",
        username: locker.label,
        name: locker.label,
      }),
      alumId: null,
      userId: locker.label,
    };
  }

  return null;
}

export async function getEventActor(): Promise<EventActor | null> {
  const jar = await cookies();
  return eventActorFromTokens({
    staffToken: jar.get(SESSION_COOKIE)?.value,
    alumToken: jar.get(HOYA_ALUM_SESSION_COOKIE)?.value,
  });
}
