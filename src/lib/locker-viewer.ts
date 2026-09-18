import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import {
  HOYA_ALUM_SESSION_COOKIE,
  canPostNewsflash,
  lockerRoleLabel,
  readHoyaAlumSession,
  type LockerRole,
} from "@/lib/hoya-alum-session";
import { viewerLabelFromAccountId } from "@/lib/messages-auth";

export type LockerViewer = {
  role: LockerRole | "coach";
  label: string;
  source: "hoya_alum_session" | "ga_session";
  canPostNewsflash: boolean;
  roleLabel: string;
};

export async function getLockerViewer(): Promise<LockerViewer | null> {
  const jar = await cookies();
  const locker = readHoyaAlumSession(jar.get(HOYA_ALUM_SESSION_COOKIE)?.value);
  if (locker) {
    return {
      role: locker.role,
      label: locker.label,
      source: "hoya_alum_session",
      canPostNewsflash: canPostNewsflash(locker.role),
      roleLabel: lockerRoleLabel(locker.role),
    };
  }

  const messagesAlum = readAlumniSessionFromCookies((name) => jar.get(name)?.value);
  if (messagesAlum) {
    return {
      role: "alum",
      label: viewerLabelFromAccountId(messagesAlum.accountId),
      source: "hoya_alum_session",
      canPostNewsflash: false,
      roleLabel: lockerRoleLabel("alum"),
    };
  }

  if (isValidSessionToken(jar.get(SESSION_COOKIE)?.value)) {
    return {
      role: "coach",
      label: "Staff",
      source: "ga_session",
      canPostNewsflash: false,
      roleLabel: lockerRoleLabel("coach"),
    };
  }

  return null;
}

export async function requireLockerViewer() {
  const viewer = await getLockerViewer();
  if (!viewer) redirect("/home/login");
  return viewer;
}
