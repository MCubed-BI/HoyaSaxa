/**
 * One sign-in path: username / Net ID + password.
 * Admins (env, Development staff_roles, or Admin-grant overlay) mint `ga_session`.
 * Everyone else mints the alum session when credentials match a claimed account.
 */
import {
  alumSessionIdentityForAccount,
  authenticateAlumni,
  type AlumniAccount,
} from "@/lib/alumni-claim";
import {
  authenticateStaffLogin,
  getCoachCredentials,
} from "@/lib/auth";
import { isMissingDatabaseConfig } from "@/lib/db";
import {
  verifyLockerCredentials,
  type LockerRole,
} from "@/lib/hoya-alum-session";
import { isAdminEmail, isAssignedAdmin } from "@/lib/platform-roles";
import {
  homePathForRole,
  isAdminRole,
  resolveRoleFromEnv,
  type Role,
} from "@/lib/roles";
import { lookupAssignedRole } from "@/lib/staff-roles";

export type CentralAlumIdentity = {
  role: "alum" | "board";
  alumniId: string;
  email: string;
  name: string;
};

export type CentralLoginSuccess =
  | {
      kind: "admin";
      username: string;
      session: "env" | "db";
      homePath: string;
      /** When the admin also has a claimed roster row, keep alum cookies too. */
      alumIdentity?: CentralAlumIdentity;
    }
  | {
      kind: "alum";
      homePath: string;
      identity: CentralAlumIdentity;
      account: AlumniAccount;
    }
  | {
      kind: "locker-preview";
      homePath: string;
      role: LockerRole;
      label: string;
    };

export type CentralLoginFailure = { kind: "invalid" };

export type CentralLoginResult = CentralLoginSuccess | CentralLoginFailure;

function safeNextPath(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value === "/login" || value === "/home/login" || value === "/alumni-login") return fallback;
  if (value.startsWith("/api/")) return fallback;
  return value;
}

export function resolveCentralLoginNext(
  requested: string | null | undefined,
  result: CentralLoginSuccess,
) {
  const fallback =
    result.kind === "admin"
      ? result.homePath
      : result.kind === "alum" && !result.account.netId
        ? "/me"
        : result.homePath;
  return safeNextPath(requested, fallback);
}

async function elevateAlumniToAdmin(account: AlumniAccount): Promise<CentralLoginSuccess | null> {
  let identity: CentralAlumIdentity;
  try {
    identity = await alumSessionIdentityForAccount(account);
  } catch {
    return null;
  }

  let assignedRole: string | null = null;
  try {
    assignedRole = await lookupAssignedRole({
      alumniId: identity.alumniId,
      email: account.email,
      username: account.netId,
      name: identity.name,
    });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) assignedRole = null;
    else throw error;
  }

  // Only explicit grants (staff_roles) or ADMIN_EMAILS — not seed name/id matches.
  const admin = isAssignedAdmin(assignedRole) || isAdminEmail(account.email);
  if (!admin) return null;

  const username = (account.netId || identity.name || account.email).trim();
  return {
    kind: "admin",
    username,
    session: "db",
    homePath: homePathForRole("owner"),
    alumIdentity: identity,
  };
}

/**
 * Authenticate a single username/Net ID + password against staff, then alumni, then locker preview.
 */
export async function authenticateCentralLogin(
  username: string,
  password: string,
): Promise<CentralLoginResult> {
  const trimmed = username.trim();
  if (!trimmed || !password) return { kind: "invalid" };

  const staff = await authenticateStaffLogin(trimmed, password);
  if (staff) {
    const role: Role =
      staff.session === "db"
        ? "owner"
        : resolveRoleFromEnv(staff.username, getCoachCredentials().username);

    if (isAdminRole(role)) {
      return {
        kind: "admin",
        username: staff.username,
        session: staff.session,
        homePath: homePathForRole(role),
      };
    }

    // Env board / alum preview names share the staff password list but stay alum-facing.
    return {
      kind: "locker-preview",
      homePath: "/home",
      role: role === "board" ? "board" : "alum",
      label: staff.username,
    };
  }

  try {
    const account = await authenticateAlumni(trimmed, password);
    const elevated = await elevateAlumniToAdmin(account);
    if (elevated) return elevated;

    const identity = await alumSessionIdentityForAccount(account);
    return {
      kind: "alum",
      homePath: "/home",
      identity,
      account,
    };
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      // Fall through to locker preview when DB is unavailable.
    } else if (error instanceof Error && /not recognized|Claim a roster/i.test(error.message)) {
      // Continue to locker preview credentials.
    } else {
      throw error;
    }
  }

  const preview = verifyLockerCredentials(trimmed, password);
  if (preview) {
    return {
      kind: "locker-preview",
      homePath: "/home",
      role: preview.role,
      label: preview.label,
    };
  }

  return { kind: "invalid" };
}
