import { ALUM_SESSION_COOKIE, isPreviewAlumSession, readAlumSession } from "@/lib/alum-session";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { SESSION_COOKIE, getCoachCredentials, getSessionUsername } from "@/lib/auth";
import { HOYA_ALUM_SESSION_COOKIE, readHoyaAlumSession } from "@/lib/hoya-alum-session";
import {
  accessModeForRole,
  canPostCoachMessage,
  isAdminRole,
  resolveRoleFromEnv,
  type AccessMode,
  type Role,
} from "@/lib/roles";

export type CookieReader = {
  get(name: string): { value: string } | undefined | null;
};

export type RequestAccess = {
  role: Role;
  mode: AccessMode;
  source: "staff" | "alum-session" | "alumni";
  label: string;
  alumniId: string | null;
  verifiedHoya: boolean;
};

export function isCoachComposePath(pathname: string) {
  const path = normalizePath(pathname);
  return path === "/api/portal/coach-messages" || path === "/api/messages/channels/sgarlata/posts";
}

export function isVerifiedHoyaIdentity(input: { role?: string | null; alumniId?: string | null }) {
  if (input.role && input.role !== "alum") return false;
  const alumniId = input.alumniId?.trim() ?? "";
  if (!alumniId) return false;
  return !isPreviewAlumSession({
    v: 1,
    role: "alum",
    alumniId,
    email: "",
    name: "",
    exp: Math.floor(Date.now() / 1000) + 60,
  });
}

export function resolveCookieAccess(cookies: CookieReader): RequestAccess | null {
  const staffUsername = getSessionUsername(cookies.get(SESSION_COOKIE)?.value);
  if (staffUsername) {
    const role = resolveRoleFromEnv(staffUsername, getCoachCredentials().username);
    return {
      role,
      mode: accessModeForRole(role),
      source: "staff",
      label: staffUsername,
      alumniId: null,
      verifiedHoya: false,
    };
  }

  const token =
    cookies.get(ALUM_SESSION_COOKIE)?.value ?? cookies.get(HOYA_ALUM_SESSION_COOKIE)?.value ?? null;
  const contract = readAlumSession(token);
  if (contract) {
    return {
      role: contract.role,
      mode: accessModeForRole(contract.role),
      source: "alum-session",
      label: contract.name || contract.email || contract.role,
      alumniId: isPreviewAlumSession(contract) ? null : contract.alumniId,
      verifiedHoya: isVerifiedHoyaIdentity(contract),
    };
  }

  const locker = readHoyaAlumSession(token);
  if (locker) {
    return {
      role: locker.role,
      mode: accessModeForRole(locker.role),
      source: "alum-session",
      label: locker.label,
      alumniId: null,
      verifiedHoya: false,
    };
  }

  const claim = readAlumniSessionFromCookies((name) => cookies.get(name)?.value);
  if (claim) {
    return {
      role: "alum",
      mode: "alum",
      source: "alumni",
      label: "Alumnus",
      alumniId: claim.accountId.startsWith("locker:") ? null : claim.accountId,
      verifiedHoya: !claim.accountId.startsWith("locker:"),
    };
  }

  return null;
}

export function canPostCoachCompose(access: RequestAccess | null | undefined) {
  return Boolean(access && canPostCoachMessage(access.role) && isAdminRole(access.role));
}

/** Middleware + API gate. Board/Alum may read Sgarlata; only Admin may POST compose. */
export function allowRequest(access: RequestAccess | null, pathname: string, method: string) {
  const verb = method.toUpperCase();
  if (verb !== "GET" && verb !== "HEAD" && isCoachComposePath(pathname) && !canPostCoachCompose(access)) {
    return false;
  }
  return true;
}

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}
