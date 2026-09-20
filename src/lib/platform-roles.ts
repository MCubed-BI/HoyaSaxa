/**
 * Platform roles for the Myspace / feed / badge stack.
 *
 * Cookie contracts stay unchanged:
 *   - staff: `ga_session` (owner / coach)
 *   - alum / board: `hoya_alum_session` (`{ v:1, role:"alum"|"board", ... }` or locker preview)
 *
 * Platform roles (this module): `admin` | `board` | `alum`
 *   - admin  — see / post every For You section (brothers, board, sgarlata) + profile.
 *              Staff tools still need `ga_session`.
 *   - board  — Alum capabilities + Message from the Board (`board` section). No Sgarlata compose.
 *              Granted via Admin toggle → `staff_roles` (`assignedRole=board`).
 *   - alum   — claim/login unlocks For You Brothers, directory, /me photo edit; Verified Hoya.
 *
 * Prefer ADMIN_EMAILS, then `staff_roles` (role=admin), then a coach `ga_session`.
 * Seeded admins: Lars (board cookie), Sgarlata / Hoyas (coach session),
 * Michael Kasten / Mike (alum id c8fc1d9c-d5a7-445d-8e59-b2bddd53d136).
 */
import { DEFAULT_ADMIN_USERNAMES, parseCsvEnv, type Role } from "@/lib/roles";

export const PLATFORM_ROLES = ["admin", "board", "alum"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const ADMIN_ROLE = "admin" as const;
export const PLATFORM_BOARD_ROLE = "board" as const;
export const PLATFORM_ALUM_ROLE = "alum" as const;

/** Claimed Mike / Michael Kasten roster row on Neon. */
export const SEED_ADMIN_ALUMNI_ID = "c8fc1d9c-d5a7-445d-8e59-b2bddd53d136";

export const SEED_ADMINS = {
  lars: {
    usernames: ["Lars"],
    names: ["Lars"],
    sessionRole: "board" as const,
  },
  sgarlata: {
    usernames: ["Sgarlata", "Hoyas"],
    names: ["Sgarlata", "Rob Sgarlata"],
    sessionRole: "coach" as const,
  },
  mike: {
    alumniId: SEED_ADMIN_ALUMNI_ID,
    usernames: ["Mike", "Michael Kasten"],
    names: ["Michael Kasten", "Mike Kasten", "Mike"],
    sessionRole: "alum" as const,
  },
} as const;

const SEED_ADMIN_USERNAMES = uniqueLower([
  ...SEED_ADMINS.lars.usernames,
  ...SEED_ADMINS.sgarlata.usernames,
  ...SEED_ADMINS.mike.usernames,
]);

const SEED_ADMIN_NAMES = uniqueLower([
  ...SEED_ADMINS.lars.names,
  ...SEED_ADMINS.sgarlata.names,
  ...SEED_ADMINS.mike.names,
]);

export type PlatformIdentity = {
  /** Existing session / env role (`owner` maps to admin). */
  sessionRole?: Role | "admin" | null;
  source?: "ga_session" | "hoya_alum_session" | "staff" | "alum-session" | "alumni" | null;
  email?: string | null;
  alumniId?: string | null;
  username?: string | null;
  name?: string | null;
  /** True when `ga_session` verified. Coach session is admin. */
  coachSession?: boolean;
  /** `staff_roles.role` when already loaded. */
  assignedRole?: string | null;
};

export function isPlatformRole(value: string | null | undefined): value is PlatformRole {
  return Boolean(value && (PLATFORM_ROLES as readonly string[]).includes(value));
}

export function adminEmailsFromEnv(value = process.env.ADMIN_EMAILS) {
  return parseCsvEnv(value).map((email) => email.toLowerCase());
}

export function isAdminEmail(email: string | null | undefined, envValue?: string) {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed) return false;
  return adminEmailsFromEnv(envValue).includes(trimmed);
}

export function isSeedAdminAlumniId(alumniId: string | null | undefined) {
  return Boolean(alumniId && alumniId.trim().toLowerCase() === SEED_ADMIN_ALUMNI_ID);
}

/** Usernames treated as Admin. `HOYA_ADMIN_USERNAMES` replaces the seed list when set. */
export function platformAdminUsernames() {
  const listed = parseCsvEnv(process.env.HOYA_ADMIN_USERNAMES);
  if (listed.length) return uniqueLower(listed);
  return uniqueLower([...SEED_ADMIN_USERNAMES, ...DEFAULT_ADMIN_USERNAMES]);
}

export function isSeedAdminIdentity(identity: PlatformIdentity) {
  if (isSeedAdminAlumniId(identity.alumniId)) return true;
  const admins = platformAdminUsernames();
  const username = identity.username?.trim().toLowerCase();
  if (username && admins.includes(username)) return true;
  const name = identity.name?.trim().toLowerCase();
  if (name && admins.includes(name)) return true;
  if (parseCsvEnv(process.env.HOYA_ADMIN_USERNAMES).length) return false;
  if (name && SEED_ADMIN_NAMES.includes(name)) return true;
  return false;
}

export function isAssignedAdmin(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

export function isAssignedBoard(role: string | null | undefined) {
  return role === "board";
}

/**
 * Sync resolver for middleware / cookie gates (no DB).
 * Order: coach session → ADMIN_EMAILS → seed identities → assignedRole → session role.
 */
export function resolvePlatformRole(identity: PlatformIdentity): PlatformRole {
  if (
    identity.coachSession ||
    identity.source === "ga_session" ||
    identity.source === "staff" ||
    identity.sessionRole === "owner" ||
    identity.sessionRole === "coach" ||
    identity.sessionRole === "admin"
  ) {
    return "admin";
  }
  if (isAdminEmail(identity.email) || isSeedAdminIdentity(identity) || isAssignedAdmin(identity.assignedRole)) {
    return "admin";
  }
  if (identity.sessionRole === "board" || isAssignedBoard(identity.assignedRole)) return "board";
  return "alum";
}

export function isAdmin(identity: PlatformIdentity | PlatformRole | null | undefined) {
  if (!identity) return false;
  if (typeof identity === "string") return identity === "admin";
  return resolvePlatformRole(identity) === "admin";
}

/** Admin sees / posts every feed section and may edit any profile. */
export function canSeeEverything(role: PlatformRole) {
  return role === "admin";
}

/** Admin only. Board / Alum never compose From Sgarlata. */
export function canPostSgarlataOrCoachBoard(role: PlatformRole) {
  return role === "admin";
}

/** Events are not For You sections — Admin, Board, and Alum may post them. */
export function canCreateProgramEvents(role: PlatformRole) {
  return role === "admin" || role === "board" || role === "alum";
}

/** Claim → Alum Mode surfaces. Board inherits these plus `canPostBoardSection`. */
export function alumModeCapabilities(role: PlatformRole) {
  return {
    canPostBrothers: canPostBrothers(role),
    canPostBoard: canPostBoardSection(role),
    canPostSgarlata: canPostSgarlataOrCoachBoard(role),
    canCreateEvents: canCreateProgramEvents(role),
    canSearchDirectory: canSearchDirectory(role),
    canEditSelf: canEditSelfProfile(role),
  };
}

export function canPostBrothers(role: PlatformRole) {
  return role === "admin" || role === "board" || role === "alum";
}

export function canPostBoardSection(role: PlatformRole) {
  return role === "admin" || role === "board";
}

export function canSearchDirectory(role: PlatformRole) {
  return role === "admin" || role === "board" || role === "alum";
}

export function canEditSelfProfile(role: PlatformRole) {
  return role === "admin" || role === "board" || role === "alum";
}

/** Claimed self, or any admin. Board/alum may only edit their own alumniId. */
export function canEditAlumniRecord(
  role: PlatformRole,
  actorAlumniId: string | null | undefined,
  targetAlumniId: string,
) {
  if (role === "admin") return true;
  if (!canEditSelfProfile(role)) return false;
  return Boolean(actorAlumniId && actorAlumniId === targetAlumniId);
}

export function platformRoleLabel(role: PlatformRole) {
  if (role === "admin") return "Admin";
  if (role === "board") return "Board";
  return "Alumnus";
}

export function sessionRoleToPlatformRole(role: Role | "admin"): PlatformRole {
  if (role === "owner" || role === "coach" || role === "admin") return "admin";
  if (role === "board") return "board";
  return "alum";
}

function uniqueLower(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}
