import { getAlumniPhotos } from "@/lib/alumni-photos";
import { getDatabaseUrl } from "@/lib/db";
import { type FeedSection } from "@/lib/feed-sections";
import {
  feedPostToCard,
  identityFromLabel,
  identityFromPerson,
  type ForYouCardPost,
  type ForYouIdentity,
} from "@/lib/for-you";
import { getLockerPersonById } from "@/lib/locker-directory";
import { filterFeedPostsBySection, type FeedPost } from "@/lib/locker-data";
import { loadLockerHome } from "@/lib/locker-queries";
import type { LockerViewer } from "@/lib/locker-viewer";
import { getMessageChannel, listMessagePosts } from "@/lib/messages";
import { SGARLATA_CHANNEL_SLUG } from "@/lib/messages-auth";
import { listCoachMessages } from "@/lib/portal-queries";
import { getCurrentViewer } from "@/lib/viewer";

function toSgarlataPost(row: {
  id: string;
  title?: string | null;
  body: string;
  author_label?: string | null;
  created_at: string;
}): FeedPost {
  return {
    id: `sgarlata-${row.id}`,
    author_label: row.author_label || "Coach Sgarlata",
    author_role: "official",
    audience: "for-you",
    title: row.title ?? null,
    body: row.body,
    created_at: row.created_at,
    source: "feed",
    section: "sgarlata",
  };
}

async function extraSgarlataPosts(): Promise<FeedPost[]> {
  if (!getDatabaseUrl()) return [];
  try {
    const channel = await getMessageChannel(SGARLATA_CHANNEL_SLUG, "for-you");
    if (channel) {
      const rows = await listMessagePosts(channel.id, 50);
      if (rows.length) return rows.map(toSgarlataPost);
    }
  } catch {
    // Channel tables may not exist in every environment.
  }
  try {
    const rows = await listCoachMessages(50);
    return rows.map(toSgarlataPost);
  } catch {
    return [];
  }
}

export async function loadForYouPosts(): Promise<{
  usingFallback: boolean;
  fallbackReason: string | null;
  posts: Record<FeedSection, ForYouCardPost[]>;
}> {
  const data = await loadLockerHome();
  const extras = await extraSgarlataPosts();
  const sgarlataFeed = [...filterFeedPostsBySection(data.feed, "sgarlata"), ...extras];
  const seen = new Set<string>();
  const sgarlata: ForYouCardPost[] = [];
  for (const post of sgarlataFeed.map(feedPostToCard)) {
    if (seen.has(post.id) || seen.has(`${post.title ?? ""}\n${post.body}`)) continue;
    seen.add(post.id);
    seen.add(`${post.title ?? ""}\n${post.body}`);
    sgarlata.push(post);
  }

  return {
    usingFallback: data.usingFallback,
    fallbackReason: data.fallbackReason,
    posts: {
      brothers: filterFeedPostsBySection(data.feed, "brothers").map(feedPostToCard),
      board: filterFeedPostsBySection(data.feed, "board").map(feedPostToCard),
      sgarlata,
    },
  };
}

export async function loadForYouIdentity(viewer: LockerViewer): Promise<ForYouIdentity> {
  try {
    const current = await getCurrentViewer();
    if (current?.alumniId) {
      const [person, photos] = await Promise.all([
        getLockerPersonById(current.alumniId),
        getAlumniPhotos(current.alumniId).catch(() => null),
      ]);
      if (person) {
        return identityFromPerson(
          person,
          viewer.label,
          photos?.football_photo_url || photos?.linkedin_photo_url || person.photoUrl,
        );
      }
    }
  } catch {
    // Preview locker sessions still get initials + Home locker link.
  }
  return identityFromLabel(viewer.label, "/home");
}
