import { cookies } from "next/headers";
import { isVerifiedHoyaIdentity } from "@/lib/access";
import { isPreviewAlumniId, readAlumSession } from "@/lib/alum-session";
import {
  HOYA_ALUM_SESSION_COOKIE,
  readAlumniSessionFromCookies,
} from "@/lib/alumni-auth";
import { SESSION_COOKIE, getCoachCredentials, getSessionUsername, isValidSessionToken } from "@/lib/auth";
import { getDatabaseUrl } from "@/lib/db";
import { canPostToFeedSection } from "@/lib/feed-sections";
import { readHoyaAlumSession } from "@/lib/hoya-alum-session";
import { resolvePlatformRole } from "@/lib/platform-roles";
import { lookupAlumniClaim } from "@/lib/portal-queries";
import { canPostCoachMessage, resolveRoleFromEnv } from "@/lib/roles";

export const SGARLATA_CHANNEL_SLUG = "sgarlata";

export type MessageViewer = {
  kind: "staff" | "alum";
  label: string;
  viewerKey: string;
  canPost: boolean;
  verifiedHoya?: boolean;
  alumniId?: string | null;
};

const PUBLIC_PATHS = [
  "/login",
  "/locker",
  "/api/login",
  "/api/logout",
  "/api/messages/alum-session",
];

const ALUM_ALLOWED_PREFIXES = [
  "/messages",
  "/message",
  "/locker",
  "/api/messages",
  "/api/logout",
];

export function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico" || pathname === "/robots.txt") return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)) return true;
  return false;
}

export function isAlumAllowedPath(pathname: string) {
  return ALUM_ALLOWED_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isDataSyncPath(pathname: string) {
  return pathname === "/sync" || pathname.startsWith("/sync/") || pathname.startsWith("/api/data-sync");
}

export function loginPathFor(pathname: string) {
  return isAlumAllowedPath(pathname) ? "/locker" : "/login";
}

export function canPostSgarlata(viewer: MessageViewer | null | undefined) {
  return Boolean(viewer?.canPost);
}

export function defaultAlumAccessCode() {
  return process.env.HOYA_ALUM_ACCESS_CODE?.trim() || "HoyaSaxa";
}

export function verifyAlumAccessCode(code: string) {
  return code.trim() === defaultAlumAccessCode();
}

export function lockerAccountId(email: string | null | undefined) {
  const trimmed = email?.trim().toLowerCase();
  if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return `locker:${trimmed}`;
  }
  return "locker:guest";
}

export function viewerLabelFromAccountId(accountId: string) {
  if (accountId.startsWith("locker:")) {
    const rest = accountId.slice("locker:".length);
    return rest === "guest" ? "Alumnus" : rest;
  }
  return "Alumnus";
}

export async function getMessageViewer(): Promise<MessageViewer | null> {
  const jar = await cookies();
  const staffUsername = getSessionUsername(jar.get(SESSION_COOKIE)?.value);
  if (staffUsername || isValidSessionToken(jar.get(SESSION_COOKIE)?.value)) {
    const role = staffUsername
      ? resolveRoleFromEnv(staffUsername, getCoachCredentials().username)
      : "coach";
    return {
      kind: "staff",
      label: staffUsername || "Staff",
      viewerKey: staffUsername ? `staff:${staffUsername.toLowerCase()}` : "staff",
      canPost: canPostCoachMessage(role),
      verifiedHoya: false,
      alumniId: null,
    };
  }

  const token = jar.get(HOYA_ALUM_SESSION_COOKIE)?.value;
  const contract = readAlumSession(token);
  if (contract) {
    const alumniId = isPreviewAlumniId(contract.alumniId) ? null : contract.alumniId;
    const platformRole = resolvePlatformRole({
      sessionRole: contract.role,
      source: "hoya_alum_session",
      email: contract.email,
      alumniId,
      name: contract.name,
    });
    return {
      kind: "alum",
      label: contract.name || contract.email || "Alumnus",
      viewerKey: `alum:contract:${contract.alumniId}`,
      canPost: canPostToFeedSection(platformRole, "sgarlata"),
      verifiedHoya: isVerifiedHoyaIdentity(contract),
      alumniId,
    };
  }

  const alum = readAlumniSessionFromCookies((name) => jar.get(name)?.value);
  if (alum) {
    let alumniId: string | null = null;
    if (!alum.accountId.startsWith("locker:") && getDatabaseUrl()) {
      try {
        alumniId = (await lookupAlumniClaim(alum.accountId)).alumniId;
      } catch {
        alumniId = null;
      }
    }
    return {
      kind: "alum",
      label: viewerLabelFromAccountId(alum.accountId),
      viewerKey: `alum:${alum.accountId}`,
      canPost: false,
      verifiedHoya: !alum.accountId.startsWith("locker:"),
      alumniId,
    };
  }

  const locker = readHoyaAlumSession(token);
  if (locker) {
    const platformRole = resolvePlatformRole({
      sessionRole: locker.role,
      source: "hoya_alum_session",
      username: locker.label,
      name: locker.label,
    });
    return {
      kind: "alum",
      label: locker.label,
      viewerKey: `alum:home:${locker.role}:${locker.label.toLowerCase()}`,
      canPost: canPostToFeedSection(platformRole, "sgarlata"),
      verifiedHoya: isVerifiedHoyaIdentity({ role: locker.role }),
      alumniId: null,
    };
  }

  return null;
}

export async function hasStaffSession() {
  const jar = await cookies();
  return isValidSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export function staffUnauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export { HOYA_ALUM_SESSION_COOKIE };
