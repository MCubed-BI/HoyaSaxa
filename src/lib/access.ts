import { ALUM_SESSION_COOKIE, isPreviewAlumniId, readAlumSession } from "@/lib/alum-session";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { SESSION_COOKIE, getCoachCredentials, getSessionUsername } from "@/lib/auth";
import { HOYA_ALUM_SESSION_COOKIE, readHoyaAlumSession } from "@/lib/hoya-alum-session";
import { resolvePlatformRole } from "@/lib/platform-roles";
import { resolveRoleFromEnv, type AccessMode, type Role } from "@/lib/roles";

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

/**
 * Verified Hoya is a claim/alum-session badge, including preview `Alum` login.
 * Board and staff cookies are not auto-verified. A claim session with a real
 * alumniId still counts when role is omitted.
 */
export function isVerifiedHoyaIdentity(input: { role?: string | null; alumniId?: string | null }) {
  if (input.role && input.role !== "alum") return false;
  if (input.role === "alum") return true;
  const alumniId = input.alumniId?.trim() ?? "";
  if (!alumniId || isPreviewAlumniId(alumniId)) return false;
  return true;
}

export function resolveCookieAccess(cookies: CookieReader): RequestAccess | null {
  const staffUsername = getSessionUsername(cookies.get(SESSION_COOKIE)?.value);
  if (staffUsername) {
    const role = resolveRoleFromEnv(staffUsername, getCoachCredentials().username);
    return {
      role,
      mode: resolvePlatformRole({
        sessionRole: role,
        source: "staff",
        username: staffUsername,
        name: staffUsername,
        coachSession: true,
      }),
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
    const alumniId = isPreviewAlumniId(contract.alumniId) ? null : contract.alumniId;
    return {
      role: contract.role,
      mode: resolvePlatformRole({
        sessionRole: contract.role,
        source: "alum-session",
        email: contract.email,
        alumniId,
        name: contract.name,
        username: contract.name,
      }),
      source: "alum-session",
      label: contract.name || contract.email || contract.role,
      alumniId,
      verifiedHoya: isVerifiedHoyaIdentity(contract),
    };
  }

  const locker = readHoyaAlumSession(token);
  if (locker) {
    return {
      role: locker.role,
      mode: resolvePlatformRole({
        sessionRole: locker.role,
        source: "alum-session",
        username: locker.label,
        name: locker.label,
      }),
      source: "alum-session",
      label: locker.label,
      alumniId: null,
      verifiedHoya: isVerifiedHoyaIdentity({ role: locker.role }),
    };
  }

  const claim = readAlumniSessionFromCookies((name) => cookies.get(name)?.value);
  if (claim) {
    const alumniId = claim.accountId.startsWith("locker:") ? null : claim.accountId;
    return {
      role: "alum",
      mode: resolvePlatformRole({
        sessionRole: "alum",
        source: "alumni",
        alumniId,
      }),
      source: "alumni",
      label: "Alumnus",
      alumniId,
      verifiedHoya: Boolean(alumniId),
    };
  }

  return null;
}

/** Admin (including seeded Lars / Sgarlata / Mike) may compose Sgarlata. Board cannot. */
export function canPostCoachCompose(access: RequestAccess | null | undefined) {
  return Boolean(access && access.mode === "admin");
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
