import { getCoachCredentials, getSessionUsername } from "@/lib/auth";

export const EVENT_CATEGORIES = [
  "Game",
  "Practice",
  "Reunion",
  "Fundraiser",
  "Social",
  "Meeting",
  "Other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** Roles that Events understands. Portal/register roles are not imported. */
export type EventRole = "coach" | "board" | "alum";

export type EventActor = {
  username: string;
  role: EventRole;
  /** Claimed alumni UUID when the contract `hoya_alum_session` has a real alumniId. */
  alumId?: string | null;
  /** Stable consumer id for Coder 3 (`alumId` when claimed, else username/label). */
  userId?: string | null;
};

/**
 * Create Event auth gate
 * ----------------------
 * Allowed: `coach` and `board`.
 * Denied: `alum` (and unauthenticated).
 *
 * The seeded app has a single shared `ga_session` staff login
 * (`COACH_USERNAME`, default Hoyas). That session is treated as **coach**,
 * so Create Event is visible to the current staff login.
 *
 * Optional env lists (already used by Home / Newsflash):
 * - `HOYA_BOARD_USERNAMES` — those usernames resolve to board (can create)
 * - `HOYA_ALUM_USERNAMES` — those usernames resolve to alum (cannot create)
 *
 * A locker `hoya_alum_session` with role `board` can create. Role `alum` cannot.
 * This module does not change Register myself / claim or the portal shell.
 */
export function parseUsernameList(value: string | undefined | null) {
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

export function isEventCategory(value: string | null | undefined): value is EventCategory {
  return Boolean(value && (EVENT_CATEGORIES as readonly string[]).includes(value));
}

export function resolveEventRole(
  username: string,
  coachUsername = getCoachCredentials().username,
): EventRole {
  const needle = username.trim().toLowerCase();
  if (!needle) return "alum";

  const board = parseUsernameList(process.env.HOYA_BOARD_USERNAMES).map((item) => item.toLowerCase());
  const alum = parseUsernameList(process.env.HOYA_ALUM_USERNAMES).map((item) => item.toLowerCase());

  if (board.includes(needle)) return "board";
  if (alum.includes(needle)) return "alum";
  if (needle === coachUsername.trim().toLowerCase()) return "coach";
  return "coach";
}

export function canCreateEvents(role: EventRole | null | undefined) {
  return role === "coach" || role === "board";
}

/** Staff can check someone else in and restamp an existing row. Alum cannot. */
export function canOverrideEventCheckIn(role: EventRole | null | undefined) {
  return role === "coach" || role === "board";
}

export function getEventActorFromToken(token: string | undefined | null): EventActor | null {
  const username = getSessionUsername(token);
  if (!username) return null;
  return { username, role: resolveEventRole(username), alumId: null, userId: username };
}
