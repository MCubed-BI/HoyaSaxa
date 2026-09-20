/**
 * Canonical feed sections for the alum Myspace stack.
 *
 * Keys: `brothers` | `board` | `sgarlata`
 * Legacy Newsflash (`newsflash`, `/newsflash`) canonicalizes to `board`.
 *
 * Who can post:
 *   - brothers — alum, board, admin
 *   - board    — board, admin  (Newsflash writes land here)
 *   - sgarlata — admin only (coach session / ADMIN_EMAILS / seed / staff_roles)
 */
import {
  canPostBoardSection,
  canPostBrothers,
  canPostSgarlataOrCoachBoard,
  type PlatformRole,
} from "@/lib/platform-roles";

export const FEED_SECTIONS = ["brothers", "board", "sgarlata"] as const;
export type FeedSection = (typeof FEED_SECTIONS)[number];

export const BROTHERS_SECTION = "brothers" as const;
export const BOARD_SECTION = "board" as const;
export const SGARLATA_SECTION = "sgarlata" as const;
export const LEGACY_NEWSFLASH_SECTION = "newsflash" as const;

export const FEED_SECTION_PATHS = {
  brothers: "/feed?section=brothers",
  board: "/board",
  sgarlata: "/messages/sgarlata",
  newsflash: "/board",
} as const;

export const NEWSFLASH_REDIRECT = "/board";

export function isFeedSection(value: string | null | undefined): value is FeedSection {
  return Boolean(value && (FEED_SECTIONS as readonly string[]).includes(value));
}

/** Map UI / query / legacy aliases onto a canonical section. `newsflash` → `board`. */
export function canonicalizeFeedSection(value: string | null | undefined): FeedSection | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  if (key === "newsflash" || key === "news" || key === "lars") return "board";
  if (key === "from-sgarlata" || key === "coach" || key === "message") return "sgarlata";
  if (key === "brother" || key === "alumni" || key === "teammates") return "brothers";
  if (isFeedSection(key)) return key;
  return null;
}

export function feedSectionFromLegacySource(source: "newsflash" | "feed" | string | null | undefined): FeedSection {
  if (source === "newsflash") return "board";
  return "brothers";
}

export function feedSectionLabel(section: FeedSection) {
  if (section === "brothers") return "Brothers";
  if (section === "board") return "Board";
  return "From Sgarlata";
}

export function feedSectionPath(section: FeedSection | typeof LEGACY_NEWSFLASH_SECTION) {
  if (section === "newsflash") return FEED_SECTION_PATHS.newsflash;
  return FEED_SECTION_PATHS[section];
}

export function canPostToFeedSection(role: PlatformRole, section: FeedSection) {
  if (section === "sgarlata") return canPostSgarlataOrCoachBoard(role);
  if (section === "board") return canPostBoardSection(role);
  return canPostBrothers(role);
}

export function deniedFeedSectionMessage(role: PlatformRole, section: FeedSection) {
  if (canPostToFeedSection(role, section)) return null;
  if (section === "sgarlata") {
    return "Only admin (coach session, ADMIN_EMAILS, or seeded admins) can post to From Sgarlata.";
  }
  if (section === "board") {
    return "Only board and admin can post to the Board section.";
  }
  return "Sign in as an alumnus, board, or admin to post to Brothers.";
}

export function parseFeedSectionParam(
  value: string | string[] | null | undefined,
  fallback: FeedSection | null = null,
): FeedSection | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return canonicalizeFeedSection(raw) ?? fallback;
}
