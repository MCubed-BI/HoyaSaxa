import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { getEventActorFromToken, type EventActor } from "@/lib/event-auth";
import { HOYA_ALUM_SESSION_COOKIE, readHoyaAlumSession } from "@/lib/hoya-alum-session";

/** Staff `ga_session` first, then locker `hoya_alum_session` (board/alum). */
export async function getEventActor(): Promise<EventActor | null> {
  const jar = await cookies();
  const staff = getEventActorFromToken(jar.get(SESSION_COOKIE)?.value);
  if (staff) return staff;
  const locker = readHoyaAlumSession(jar.get(HOYA_ALUM_SESSION_COOKIE)?.value);
  if (locker) return { username: locker.label, role: locker.role };
  return null;
}
