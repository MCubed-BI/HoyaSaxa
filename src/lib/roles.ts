export const ROLES = ["owner", "coach", "alum", "board"] as const;
export type Role = (typeof ROLES)[number];

export const DEFAULT_BOARD_USERNAME = "Lars";
export const DEFAULT_ALUM_PREVIEW_USERNAME = "Alum";

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

export function staffUsernamesFromEnv(coachUsername: string) {
  const owners = parseCsvEnv(process.env.HOYA_OWNER_USERNAMES);
  const coaches = parseCsvEnv(process.env.HOYA_COACH_USERNAMES);
  const board = parseCsvEnv(process.env.HOYA_BOARD_USERNAMES);
  const alumPreview = parseCsvEnv(process.env.HOYA_ALUM_USERNAMES);

  return {
    owner: uniqueUsernames([coachUsername, ...owners]),
    coach: uniqueUsernames(coaches),
    board: uniqueUsernames(board.length ? board : [DEFAULT_BOARD_USERNAME]),
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

export function canUseOwnerTools(role: Role) {
  return role === "owner" || role === "coach";
}

export function canUseBlast(role: Role) {
  return canUseOwnerTools(role);
}

/** Selected-directory email only. Never unlocks Twilio, filter-wide blast, or Data Sync. */
export function canUseAlumEmailBlast(role: Role) {
  return role === "alum" || role === "board";
}

export function canPostCoachMessage(role: Role) {
  return canUseOwnerTools(role);
}

export function canPostNewsflash(role: Role) {
  return role === "owner" || role === "board";
}

export function canManageFundraising(role: Role) {
  return role === "owner" || role === "coach" || role === "board";
}

export function canSeeFullContact(role: Role) {
  return role === "owner" || role === "coach" || role === "board";
}

export function homePathForRole(role: Role) {
  return role === "alum" || role === "board" ? "/portal" : "/";
}

export function roleLabel(role: Role) {
  if (role === "owner") return "Owner";
  if (role === "coach") return "Coach";
  if (role === "board") return "Board";
  return "Alumnus";
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
