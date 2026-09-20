import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isVerifiedHoyaIdentity } from "@/lib/access";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { ALUM_SESSION_COOKIE, readAlumSession } from "@/lib/alum-session";
import { SESSION_COOKIE, getCoachCredentials, getSessionUsername } from "@/lib/auth";
import { canPostToFeedSection } from "@/lib/feed-sections";
import {
  HOYA_ALUM_SESSION_COOKIE,
  lockerRoleLabel,
  readHoyaAlumSession,
  type LockerRole,
} from "@/lib/hoya-alum-session";
import { viewerLabelFromAccountId } from "@/lib/messages-auth";
import { identityFromViewer } from "@/lib/platform-session";
import { resolvePlatformRole, type PlatformRole } from "@/lib/platform-roles";
import { resolveRoleFromEnv, type AccessMode } from "@/lib/roles";

export type LockerViewer = {
  role: LockerRole | "coach";
  platformRole: PlatformRole;
  label: string;
  source: "hoya_alum_session" | "ga_session";
  canPostNewsflash: boolean;
  canPostBrothers: boolean;
  canPostSgarlata: boolean;
  verifiedHoya: boolean;
  mode: AccessMode;
  roleLabel: string;
};

function lockerCapabilities(input: {
  role: LockerRole | "coach";
  label: string;
  source: "hoya_alum_session" | "ga_session";
  email?: string | null;
  alumniId?: string | null;
  username?: string | null;
  verifiedHoya?: boolean;
  sessionRole?: AccessMode | "owner" | "coach" | "alum" | "board";
}) {
  const platformRole = resolvePlatformRole(
    identityFromViewer({
      role: input.sessionRole ?? (input.role === "coach" ? "coach" : input.role),
      source: input.source,
      email: input.email,
      alumniId: input.alumniId,
      username: input.username ?? input.label,
      label: input.label,
    }),
  );
  return {
    platformRole,
    canPostNewsflash: canPostToFeedSection(platformRole, "board"),
    canPostBrothers: canPostToFeedSection(platformRole, "brothers"),
    canPostSgarlata: canPostToFeedSection(platformRole, "sgarlata"),
    verifiedHoya: Boolean(input.verifiedHoya),
    mode: platformRole,
    roleLabel: lockerRoleLabel(input.role),
  };
}

export async function getLockerViewer(): Promise<LockerViewer | null> {
  const jar = await cookies();
  const token = jar.get(HOYA_ALUM_SESSION_COOKIE)?.value ?? jar.get(ALUM_SESSION_COOKIE)?.value;
  const contract = readAlumSession(token);
  if (contract) {
    const label = contract.name || contract.email || lockerRoleLabel(contract.role);
    return {
      role: contract.role,
      label,
      source: "hoya_alum_session",
      ...lockerCapabilities({
        role: contract.role,
        label,
        source: "hoya_alum_session",
        email: contract.email,
        alumniId: contract.alumniId,
        verifiedHoya: isVerifiedHoyaIdentity(contract),
      }),
    };
  }

  const locker = readHoyaAlumSession(token);
  if (locker) {
    return {
      role: locker.role,
      label: locker.label,
      source: "hoya_alum_session",
      ...lockerCapabilities({
        role: locker.role,
        label: locker.label,
        source: "hoya_alum_session",
        verifiedHoya: isVerifiedHoyaIdentity({ role: locker.role }),
      }),
    };
  }

  const messagesAlum = readAlumniSessionFromCookies((name) => jar.get(name)?.value);
  if (messagesAlum) {
    const label = viewerLabelFromAccountId(messagesAlum.accountId);
    return {
      role: "alum",
      label,
      source: "hoya_alum_session",
      ...lockerCapabilities({
        role: "alum",
        label,
        source: "hoya_alum_session",
        verifiedHoya: !messagesAlum.accountId.startsWith("locker:"),
      }),
    };
  }

  const staffUsername = getSessionUsername(jar.get(SESSION_COOKIE)?.value);
  if (staffUsername) {
    const role = resolveRoleFromEnv(staffUsername, getCoachCredentials().username);
    const lockerRole = role === "board" || role === "alum" ? role : "coach";
    return {
      role: lockerRole,
      label: staffUsername,
      source: "ga_session",
      ...lockerCapabilities({
        role: lockerRole,
        label: staffUsername,
        source: "ga_session",
        username: staffUsername,
        sessionRole: role,
        verifiedHoya: false,
      }),
    };
  }

  return null;
}

export async function requireLockerViewer(loginPath = "/home/login") {
  const viewer = await getLockerViewer();
  if (!viewer) redirect(loginPath);
  return viewer;
}
