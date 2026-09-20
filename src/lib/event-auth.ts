import { getCoachCredentials, getSessionUsername } from "@/lib/auth";
import {
  canPostEvents,
  isPlatformRole,
  resolvePlatformRole,
  type PlatformIdentity,
  type PlatformRole,
} from "@/lib/platform-roles";

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
  /** Coder 5 overlay: `admin` | `board` | `alum`. Resolved, never stored as a second cookie. */
  platformRole?: PlatformRole | null;
  /** Claimed alumni UUID when the contract `hoya_alum_session` has a real alumniId. */
  alumId?: string | null;
  /** Stable consumer id for Coder 3 (`alumId` when claimed, else username/label). */
  userId?: string | null;
};

export type EventCreateGate =
  | EventRole
  | PlatformRole
  | {
      role: EventRole;
      platformRole?: PlatformRole | null;
      username?: string | null;
      alumId?: string | null;
    }
  | null
  | undefined;

/**
 * Create Event auth gate
 * ----------------------
 * Allowed: platform `admin` | `board` | `alum` (Coder 5 `canPostEvents` /
 * `resolvePlatformRole` / `canCreateProgramEvents`). Includes staff `ga_session`
 * (admin), Board Mode / Board grant, and claimed / locker Alum.
 * Denied: unauthenticated only. Events are not For You / Sgarlata compose.
 *
 * EventRole `coach` maps to platform admin. Check-in override stays staff-only.
 * This module does not write cookies, staff_roles, or claim/auth.
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

export function eventIdentityFromActor(actor: {
  role: EventRole;
  username?: string | null;
  alumId?: string | null;
  email?: string | null;
  source?: PlatformIdentity["source"];
  coachSession?: boolean;
}): PlatformIdentity {
  const staff = actor.coachSession || actor.source === "ga_session" || actor.role === "coach";
  return {
    sessionRole: actor.role === "coach" ? "coach" : actor.role,
    source: actor.source ?? (staff ? "ga_session" : "hoya_alum_session"),
    coachSession: Boolean(actor.coachSession || actor.role === "coach"),
    username: actor.username ?? null,
    name: actor.username ?? null,
    alumniId: actor.alumId ?? null,
    email: actor.email ?? null,
  };
}

export function platformRoleForEventActor(actor: {
  role: EventRole;
  platformRole?: PlatformRole | null;
  username?: string | null;
  alumId?: string | null;
  email?: string | null;
  source?: PlatformIdentity["source"];
  coachSession?: boolean;
}): PlatformRole {
  if (isPlatformRole(actor.platformRole)) return actor.platformRole;
  return resolvePlatformRole(eventIdentityFromActor(actor));
}

/** Stacks Coder 5 `canPostEvents`. Any authenticated admin/board/alum may post. */
export function canCreateEvents(role: EventCreateGate) {
  if (!role) return false;
  if (typeof role === "object") return canPostEvents(platformRoleForEventActor(role));
  if (isPlatformRole(role)) return canPostEvents(role);
  return canPostEvents(platformRoleForEventActor({ role }));
}

/** Staff can check someone else in and restamp an existing row. Alum cannot. */
export function canOverrideEventCheckIn(role: EventRole | null | undefined) {
  return role === "coach" || role === "board";
}

export function getEventActorFromToken(token: string | undefined | null): EventActor | null {
  const username = getSessionUsername(token);
  if (!username) return null;
  const role = resolveEventRole(username);
  return {
    username,
    role,
    platformRole: resolvePlatformRole({
      sessionRole: role === "coach" ? "coach" : role,
      source: "ga_session",
      coachSession: true,
      username,
      name: username,
    }),
    alumId: null,
    userId: username,
  };
}
