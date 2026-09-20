export const ROLES = ["owner", "coach", "alum", "board"] as const;
export type Role = (typeof ROLES)[number];

export const ACCESS_MODES = ["admin", "board", "alum"] as const;
export type AccessMode = (typeof ACCESS_MODES)[number];

export const DEFAULT_BOARD_USERNAME = "Lars";
export const DEFAULT_BOARD_PREVIEW_USERNAME = "Board";
export const DEFAULT_ALUM_PREVIEW_USERNAME = "Alum";
export const DEFAULT_ADMIN_USERNAMES = ["Lars", "Sgarlata", "Mike", "Michael", "Michael Kasten"] as const;

const ROLE_PRECEDENCE: Role[] = ["owner", "coach", "board", "alum"];

export function parseCsvEnv(value: string | undefined | null) {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

export function isRole(value: string | null | undefined): value is Role {
  return Boolean(value && (ROLES as readonly string[]).includes(value));
}

export function normalizeStaffRole(value: string | null | undefined): Role | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "admin" || trimmed === "owner") return "owner";
  if (trimmed === "coach") return "coach";
  if (trimmed === "board") return "board";
  if (trimmed === "alum" || trimmed === "alumnus") return "alum";
  return null;
}

/** Env + coach username. `HOYA_ADMIN_USERNAMES` overrides the seeded Admin list when set. */
export function adminUsernamesFromEnv(coachUsername: string) {
  const listed = parseCsvEnv(process.env.HOYA_ADMIN_USERNAMES);
  const admins = listed.length ? listed : [...DEFAULT_ADMIN_USERNAMES];
  const owners = parseCsvEnv(process.env.HOYA_OWNER_USERNAMES);
  return uniqueUsernames([coachUsername, ...admins, ...owners]);
}

export function staffUsernamesFromEnv(coachUsername: string) {
  const coaches = parseCsvEnv(process.env.HOYA_COACH_USERNAMES);
  const board = parseCsvEnv(process.env.HOYA_BOARD_USERNAMES);
  const alumPreview = parseCsvEnv(process.env.HOYA_ALUM_USERNAMES);

  return {
    owner: adminUsernamesFromEnv(coachUsername),
    coach: uniqueUsernames(coaches),
    board: uniqueUsernames(board.length ? board : [DEFAULT_BOARD_PREVIEW_USERNAME]),
    alum: uniqueUsernames(alumPreview.length ? alumPreview : [DEFAULT_ALUM_PREVIEW_USERNAME]),
  };
}

export function allStaffUsernames(coachUsername: string) {
  const lists = staffUsernamesFromEnv(coachUsername);
  return uniqueUsernames([...lists.owner, ...lists.coach, ...lists.board, ...lists.alum]);
}

export function resolveRoleFromEnv(username: string, coachUsername: string): Role {
  const lists = staffUsernamesFromEnv(coachUsername);
  const needle = username.trim().toLowerCase();
  for (const role of ROLE_PRECEDENCE) {
    if (lists[role].some((item) => item.toLowerCase() === needle)) {
      return role;
    }
  }
  return "coach";
}

export function accessModeForRole(role: Role): AccessMode {
  if (role === "owner" || role === "coach") return "admin";
  if (role === "board") return "board";
  return "alum";
}

export function isAdminRole(role: Role | null | undefined) {
  return role === "owner" || role === "coach";
}

export function isAdminUsername(username: string, coachUsername: string) {
  const needle = username.trim().toLowerCase();
  return adminUsernamesFromEnv(coachUsername).some((item) => item.toLowerCase() === needle);
}

export function canUseOwnerTools(role: Role) {
  return isAdminRole(role);
}

export function canUseBlast(role: Role) {
  return canUseOwnerTools(role);
}

/** Selected-directory email only. Never unlocks Twilio, filter-wide blast, or Data Sync. */
export function canUseAlumEmailBlast(role: Role) {
  return role === "alum" || role === "board";
}

export function canPostCoachMessage(role: Role) {
  return isAdminRole(role);
}

/** Legacy Role helper. Prefer `canPostToFeedSection(platformRole, "board")`. */
export function canPostNewsflash(role: Role) {
  return isAdminRole(role) || role === "board";
}

export function canPostBrothers(role: Role) {
  return role === "owner" || role === "coach" || role === "board" || role === "alum";
}

export function canManageFundraising(role: Role) {
  return isAdminRole(role) || role === "board";
}

export function canSeeFullContact(role: Role) {
  return isAdminRole(role) || role === "board";
}

export function homePathForRole(role: Role) {
  return role === "alum" || role === "board" ? "/portal" : "/";
}

export function roleLabel(role: Role) {
  if (role === "owner") return "Admin";
  if (role === "coach") return "Coach";
  if (role === "board") return "Board";
  return "Alumnus";
}

export function accessModeLabel(mode: AccessMode) {
  if (mode === "admin") return "Admin";
  if (mode === "board") return "Board";
  return "Alum";
}

function uniqueUsernames(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
