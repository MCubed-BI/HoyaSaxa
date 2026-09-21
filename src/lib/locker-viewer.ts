import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isVerifiedHoyaIdentity } from "@/lib/access";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { ALUM_SESSION_COOKIE, isPreviewAlumSession, readAlumSession } from "@/lib/alum-session";
import { SESSION_COOKIE, getCoachCredentials, getSessionUsername } from "@/lib/auth";
import { getDatabaseUrl } from "@/lib/db";
import { canPostToFeedSection } from "@/lib/feed-sections";
import {
  HOYA_ALUM_SESSION_COOKIE,
  lockerRoleLabel,
  readHoyaAlumSession,
  type LockerRole,
} from "@/lib/hoya-alum-session";
import { viewerLabelFromAccountId } from "@/lib/messages-auth";
import { identityFromViewer } from "@/lib/platform-session";
import { platformRoleLabel, resolvePlatformRole, type PlatformRole } from "@/lib/platform-roles";
import { resolveRoleFromEnv, type AccessMode, type Role } from "@/lib/roles";
import { lookupAssignedRole } from "@/lib/staff-roles";

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
  assignedRole?: string | null;
}) {
  const platformRole = resolvePlatformRole({
    ...identityFromViewer({
      role: input.sessionRole ?? (input.role === "coach" ? "coach" : input.role),
      source: input.source,
      email: input.email,
      alumniId: input.alumniId,
      username: input.username ?? input.label,
      label: input.label,
    }),
    assignedRole: input.assignedRole,
  });
  return {
    platformRole,
    canPostNewsflash: canPostToFeedSection(platformRole, "board"),
    canPostBrothers: canPostToFeedSection(platformRole, "brothers"),
    canPostSgarlata: canPostToFeedSection(platformRole, "sgarlata"),
    verifiedHoya: Boolean(input.verifiedHoya),
    mode: platformRole,
    roleLabel: platformRole === "board" || platformRole === "admin" ? platformRoleLabel(platformRole) : lockerRoleLabel(input.role),
  };
}

async function assignedRoleFor(input: {
  username?: string | null;
  email?: string | null;
  alumniId?: string | null;
  name?: string | null;
}) {
  if (!getDatabaseUrl()) return null;
  try {
    return await lookupAssignedRole(input);
  } catch {
    return null;
  }
}

export async function getLockerViewer(): Promise<LockerViewer | null> {
  const jar = await cookies();
  const token = jar.get(HOYA_ALUM_SESSION_COOKIE)?.value ?? jar.get(ALUM_SESSION_COOKIE)?.value;
  const contract = readAlumSession(token);
  if (contract) {
    const alumniId = isPreviewAlumSession(contract) ? null : contract.alumniId;
    const label = contract.name || contract.email || lockerRoleLabel(contract.role);
    const assignedRole = await assignedRoleFor({
      alumniId,
      email: contract.email,
      name: contract.name,
      username: contract.name,
    });
    return {
      role: contract.role,
      label,
      source: "hoya_alum_session",
      ...lockerCapabilities({
        role: contract.role,
        label,
        source: "hoya_alum_session",
        email: contract.email,
        alumniId,
        verifiedHoya: isVerifiedHoyaIdentity(contract),
        assignedRole,
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

/**
 * Header role from locker session. Staff tools only when `ga_session` is present
 * so a claimed platform-admin alum does not see Reports / Blast / Sync / Admin.
 */
export function roleFromLockerViewer(viewer: LockerViewer | null | undefined): Role | undefined {
  if (!viewer) return undefined;
  if (viewer.source === "ga_session") {
    if (viewer.platformRole === "admin" || viewer.role === "coach") {
      return viewer.platformRole === "admin" ? "owner" : "coach";
    }
  }
  if (viewer.role === "board" || viewer.platformRole === "board") return "board";
  return "alum";
}
