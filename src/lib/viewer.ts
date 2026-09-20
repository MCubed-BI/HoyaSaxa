import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ALUMNI_SESSION_COOKIE, readAlumniSessionAccountId, readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { ALUM_SESSION_COOKIE, isPreviewAlumSession, readAlumSession } from "@/lib/alum-session";
import { SESSION_COOKIE, getCoachCredentials, getSessionUsername } from "@/lib/auth";
import { readHoyaAlumSession } from "@/lib/hoya-alum-session";
import { getDatabaseUrl } from "@/lib/db";
import { lookupAlumniClaim, lookupStaffRole } from "@/lib/portal-queries";
import { identityFromViewer } from "@/lib/platform-session";
import { resolvePlatformRole, type PlatformRole } from "@/lib/platform-roles";
import { homePathForRole, resolveRoleFromEnv, roleLabel, type Role } from "@/lib/roles";

export type Viewer = {
  role: Role;
  platformRole: PlatformRole;
  label: string;
  username: string | null;
  email: string | null;
  accountId: string | null;
  alumniId: string | null;
  source: "staff" | "alum-session" | "alumni";
  homePath: string;
};

function withPlatformRole(
  viewer: Omit<Viewer, "platformRole">,
  assignedRole?: string | null,
): Viewer {
  return {
    ...viewer,
    platformRole: resolvePlatformRole({
      ...identityFromViewer(viewer),
      assignedRole,
    }),
  };
}

export async function getCurrentViewer(): Promise<Viewer | null> {
  const jar = await cookies();
  const staffUsername = getSessionUsername(jar.get(SESSION_COOKIE)?.value);
  if (staffUsername) {
    let role = resolveRoleFromEnv(staffUsername, getCoachCredentials().username);
    let assignedRole: string | null = null;
    if (getDatabaseUrl()) {
      try {
        assignedRole = await lookupStaffRole(staffUsername);
        if (assignedRole === "admin") {
          role = "owner";
        } else if (assignedRole && assignedRole !== "alum") {
          role = assignedRole;
        }
      } catch {
        // Env mapping is enough when portal tables are not reachable.
      }
    }
    return withPlatformRole(
      {
        role,
        label: staffUsername,
        username: staffUsername,
        email: null,
        accountId: null,
        alumniId: null,
        source: "staff",
        homePath: homePathForRole(role),
      },
      assignedRole,
    );
  }

  const token = jar.get(ALUM_SESSION_COOKIE)?.value ?? null;
  const contract = readAlumSession(token);
  if (contract) {
    return withPlatformRole({
      role: contract.role,
      label: contract.name || contract.email || roleLabel(contract.role),
      username: null,
      email: contract.email || null,
      accountId: null,
      alumniId: isPreviewAlumSession(contract) ? null : contract.alumniId,
      source: "alum-session",
      homePath: "/portal",
    });
  }

  const locker = readHoyaAlumSession(token);
  if (locker) {
    return withPlatformRole({
      role: locker.role,
      label: locker.label,
      username: locker.label,
      email: null,
      accountId: null,
      alumniId: null,
      source: "alum-session",
      homePath: "/portal",
    });
  }

  const messagesAlum = readAlumniSessionFromCookies((name) => jar.get(name)?.value);
  const accountId = messagesAlum?.accountId ?? readAlumniSessionAccountId(jar.get(ALUMNI_SESSION_COOKIE)?.value);
  if (!accountId) return null;

  let email: string | null = null;
  let alumniId: string | null = null;
  if (getDatabaseUrl()) {
    try {
      const claim = await lookupAlumniClaim(accountId);
      email = claim.account?.email ?? null;
      alumniId = claim.alumniId;
    } catch {
      // Claim tables live on Register/Claim. Session still counts as alum.
    }
  }

  return withPlatformRole({
    role: "alum",
    label: email ?? "Alumnus",
    username: null,
    email,
    accountId,
    alumniId,
    source: "alumni",
    homePath: "/portal",
  });
}

export async function requireViewer() {
  const viewer = await getCurrentViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

export async function requireRole(allowed: Role[]) {
  const viewer = await requireViewer();
  if (!allowed.includes(viewer.role)) {
    redirect(viewer.homePath);
  }
  return viewer;
}

export async function requirePlatformRole(allowed: PlatformRole[]) {
  const viewer = await requireViewer();
  if (!allowed.includes(viewer.platformRole)) {
    redirect(viewer.homePath);
  }
  return viewer;
}

export function viewerSubtitle(viewer: Viewer) {
  const role = roleLabel(viewer.role);
  if (viewer.alumniId) return `${role} · claimed record linked`;
  if (viewer.source === "alum-session") return `${role} · hoya_alum_session`;
  if (viewer.source === "alumni") return `${role} · claim hook ready`;
  return role;
}
