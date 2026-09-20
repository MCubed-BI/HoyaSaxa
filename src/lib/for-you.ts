import { classYearLabel, displayName } from "@/lib/format";
import { toNameFields } from "@/lib/locker-classify";
import type { FeedPost } from "@/lib/locker-data";
import { athleteHref } from "@/lib/locker-paths";
import type { LockerPerson } from "@/lib/locker-types";
import { FEED_SECTIONS, canPostToFeedSection, type FeedSection } from "@/lib/feed-sections";
import type { PlatformRole } from "@/lib/platform-roles";

export { FEED_SECTIONS };
export type { FeedSection };

export type ForYouCardPost = {
  id: string;
  authorLabel: string;
  createdAt: string;
  body: string;
  title?: string | null;
  mediaUrl?: string | null;
  section: FeedSection;
};

export type ForYouIdentity = {
  name: string;
  classYear: string | null;
  lockerHref: string;
  photoUrl: string | null;
  firstName: string | null;
  lastName: string;
  preferredName: string | null;
  fullName: string | null;
};

/**
 * For You compose boxes. Same ACL as `POST /api/feed/posts` —
 * `canPostToFeedSection` (alum → brothers; board → brothers+board; admin → all).
 */
export function forYouComposableSections(role: PlatformRole): FeedSection[] {
  return FEED_SECTIONS.filter((section) => canPostToFeedSection(role, section));
}

/** Visible For You headings. Keys stay `brothers` | `board` | `sgarlata`. */
export function forYouHeading(section: FeedSection) {
  if (section === "brothers") return "From Your Brothers";
  if (section === "board") return "From Your Board";
  return "From Sgarlata";
}

export function forYouEmptyCopy(section: FeedSection) {
  if (section === "brothers") {
    return "When verified alumni or players post, their notes show here.";
  }
  if (section === "board") {
    return "When the Georgetown Board publishes, alumni will see it here.";
  }
  return "When Coach Sgarlata or the staff post, the note will show here.";
}

export function feedPostToCard(post: FeedPost): ForYouCardPost {
  const section: FeedSection = post.section ?? (post.source === "newsflash" ? "board" : "brothers");
  return {
    id: post.id,
    authorLabel: post.author_label,
    createdAt: post.created_at,
    body: post.body,
    title: post.title,
    mediaUrl: post.media_url ?? null,
    section,
  };
}

export function identityFromPerson(
  person: Pick<
    LockerPerson,
    "firstName" | "lastName" | "preferredName" | "fullName" | "photoUrl" | "classYear" | "classLabel" | "id"
  >,
  fallbackName: string,
  photoUrl?: string | null,
): ForYouIdentity {
  return {
    name: displayName(toNameFields(person)) || fallbackName,
    classYear: person.classLabel || classYearLabel(person.classYear),
    lockerHref: athleteHref(person.id),
    photoUrl: photoUrl || person.photoUrl,
    firstName: person.firstName,
    lastName: person.lastName,
    preferredName: person.preferredName,
    fullName: person.fullName,
  };
}

export function identityFromLabel(name: string, lockerHref = "/home"): ForYouIdentity {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    name: name.trim() || "Hoya",
    classYear: null,
    lockerHref,
    photoUrl: null,
    firstName: parts[0] ?? name,
    lastName: parts.slice(1).join(" ") || name,
    preferredName: null,
    fullName: name,
  };
}
