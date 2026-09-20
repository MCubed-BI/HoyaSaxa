import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isVerifiedHoyaIdentity } from "@/lib/access";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { ALUM_SESSION_COOKIE, isPreviewAlumSession, readAlumSession } from "@/lib/alum-session";
import { SESSION_COOKIE, getCoachCredentials, getSessionUsername } from "@/lib/auth";
import {
  HOYA_ALUM_SESSION_COOKIE,
  lockerRoleLabel,
  readHoyaAlumSession,
  type LockerRole,
} from "@/lib/hoya-alum-session";
import { viewerLabelFromAccountId } from "@/lib/messages-auth";
import {
  accessModeForRole,
  canPostBrothers,
  canPostNewsflash,
  resolveRoleFromEnv,
  type AccessMode,
} from "@/lib/roles";

export type LockerViewer = {
  role: LockerRole | "coach";
  label: string;
  source: "hoya_alum_session" | "ga_session";
  canPostNewsflash: boolean;
  canPostBrothers: boolean;
  verifiedHoya: boolean;
  mode: AccessMode;
  roleLabel: string;
};

export async function getLockerViewer(): Promise<LockerViewer | null> {
  const jar = await cookies();
  const token = jar.get(HOYA_ALUM_SESSION_COOKIE)?.value ?? jar.get(ALUM_SESSION_COOKIE)?.value;
  const contract = readAlumSession(token);
  if (contract) {
    return {
      role: contract.role,
      label: contract.name || contract.email || lockerRoleLabel(contract.role),
      source: "hoya_alum_session",
      canPostNewsflash: canPostNewsflash(contract.role),
      canPostBrothers: canPostBrothers(contract.role),
      verifiedHoya: isVerifiedHoyaIdentity(contract) && !isPreviewAlumSession(contract),
      mode: accessModeForRole(contract.role),
      roleLabel: lockerRoleLabel(contract.role),
    };
  }

  const locker = readHoyaAlumSession(token);
  if (locker) {
    return {
      role: locker.role,
      label: locker.label,
      source: "hoya_alum_session",
      canPostNewsflash: canPostNewsflash(locker.role),
      canPostBrothers: canPostBrothers(locker.role),
      verifiedHoya: false,
      mode: accessModeForRole(locker.role),
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
      canPostBrothers: true,
      verifiedHoya: !messagesAlum.accountId.startsWith("locker:"),
      mode: "alum",
      roleLabel: lockerRoleLabel("alum"),
    };
  }

  const staffUsername = getSessionUsername(jar.get(SESSION_COOKIE)?.value);
  if (staffUsername) {
    const role = resolveRoleFromEnv(staffUsername, getCoachCredentials().username);
    return {
      role: role === "board" || role === "alum" ? role : "coach",
      label: staffUsername,
      source: "ga_session",
      canPostNewsflash: canPostNewsflash(role),
      canPostBrothers: canPostBrothers(role),
      verifiedHoya: false,
      mode: accessModeForRole(role),
      roleLabel: lockerRoleLabel(role === "board" || role === "alum" ? role : "coach"),
    };
  }

  return null;
}

export async function requireLockerViewer(loginPath = "/home/login") {
  const viewer = await getLockerViewer();
  if (!viewer) redirect(loginPath);
  return viewer;
}
