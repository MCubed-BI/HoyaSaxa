import { cookies } from "next/headers";
import {
  HOYA_ALUM_SESSION_COOKIE,
  readAlumniSessionFromCookies,
} from "@/lib/alumni-auth";
import { readAlumSession } from "@/lib/alum-session";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { readHoyaAlumSession } from "@/lib/hoya-alum-session";

export const SGARLATA_CHANNEL_SLUG = "sgarlata";

export type MessageViewer = {
  kind: "staff" | "alum";
  label: string;
  viewerKey: string;
  canPost: boolean;
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
  return Boolean(viewer?.kind === "staff" && viewer.canPost);
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
  if (isValidSessionToken(jar.get(SESSION_COOKIE)?.value)) {
    return {
      kind: "staff",
      label: "Staff",
      viewerKey: "staff",
      canPost: true,
    };
  }

  const token = jar.get(HOYA_ALUM_SESSION_COOKIE)?.value;
  const contract = readAlumSession(token);
  if (contract) {
    return {
      kind: "alum",
      label: contract.name || contract.email || "Alumnus",
      viewerKey: `alum:contract:${contract.alumniId}`,
      canPost: false,
    };
  }

  const alum = readAlumniSessionFromCookies((name) => jar.get(name)?.value);
  if (alum) {
    return {
      kind: "alum",
      label: viewerLabelFromAccountId(alum.accountId),
      viewerKey: `alum:${alum.accountId}`,
      canPost: false,
    };
  }

  const locker = readHoyaAlumSession(token);
  if (locker) {
    return {
      kind: "alum",
      label: locker.label,
      viewerKey: `alum:home:${locker.role}:${locker.label.toLowerCase()}`,
      canPost: false,
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
