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
 * Optional env lists (same names the alum-portal PR uses, read here only):
 * - `HOYA_BOARD_USERNAMES` — those usernames resolve to board (can create)
 * - `HOYA_ALUM_USERNAMES` — those usernames resolve to alum (cannot create)
 *
 * This module does not add alumni login, Register myself, or a portal shell.
 * When those land, they should keep using `canCreateEvents(role)`.
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

export function getEventActorFromToken(token: string | undefined | null): EventActor | null {
  const username = getSessionUsername(token);
  if (!username) return null;
  return { username, role: resolveEventRole(username) };
}
