import { isPreviewAlumniId } from "@/lib/alum-preview";
import { isLockerStubId } from "@/lib/locker-stubs";
import type { MessageChannelRow, MessagePostRow } from "@/lib/messages";
import type { MessageViewer } from "@/lib/messages-auth";
import {
  canPostToMessageChannel,
  canViewMessageChannel,
  dmAuthorLabel,
  dmDisplayName,
  dmParticipantId,
  isDmChannel,
  type DmParticipantChannel,
} from "@/lib/messages-dm";

/** Dual-write of `message_reads`: session `viewerKey` plus a stable participant id. */
export const MESSAGE_READ_KEY_NOTE =
  "Read watermarks are written to both the session viewer_key (staff:… / alum:…) and the stable DM participant id (alumni UUID or admin-{user}) so Admin and Alum sessions for the same person share unread state. Lookups use MAX(last_read_at) across those keys. Old rows keyed only by viewer_key still mark a channel read.";

export const MESSAGE_POSTS_PAGE_SIZE = 50;
export const MESSAGE_POSTS_MAX_LIMIT = 80;
export const UNREAD_BADGE_CAP = 9;

export type MessagePostsQuery = {
  after?: string;
  before?: string;
  limit: number;
};

export type MessagePostsPage = {
  posts: MessagePostRow[];
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
};

export type MessageChannelAccessAction = "read" | "post";

export type MessageJsonError = {
  status: number;
  error: string;
};

export function wantsJsonRequest(request: Request) {
  const accept = request.headers.get("accept") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/json") || accept.includes("application/json");
}

export function isInboxVisibleChannel(channel: Pick<MessageChannelRow, "kind">) {
  return channel.kind !== "group";
}

export function clampMessagePostsLimit(value: number | undefined, fallback = MESSAGE_POSTS_PAGE_SIZE) {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.min(MESSAGE_POSTS_MAX_LIMIT, Math.max(1, n));
}

export function parseMessagePostsQuery(searchParams: URLSearchParams): MessagePostsQuery {
  const after = searchParams.get("after")?.trim() || undefined;
  const before = searchParams.get("before")?.trim() || undefined;
  const rawLimit = searchParams.get("limit");
  const parsed = rawLimit ? Number.parseInt(rawLimit, 10) : NaN;
  return {
    after,
    before: after ? undefined : before,
    limit: clampMessagePostsLimit(Number.isFinite(parsed) ? parsed : undefined),
  };
}

function postSortKey(post: Pick<MessagePostRow, "id" | "created_at">) {
  return `${post.created_at}\0${post.id}`;
}

function comparePosts(a: Pick<MessagePostRow, "id" | "created_at">, b: Pick<MessagePostRow, "id" | "created_at">) {
  const left = postSortKey(a);
  const right = postSortKey(b);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * In-memory pagination matching `listMessagePostsPage` SQL:
 * default = latest `limit` rows (ASC); `after` = newer; `before` = older.
 */
export function paginateMessagePosts(
  posts: MessagePostRow[],
  query: Pick<MessagePostsQuery, "after" | "before" | "limit">,
): MessagePostsPage {
  const ordered = [...posts].sort(comparePosts);
  const limit = clampMessagePostsLimit(query.limit);

  if (query.after) {
    const index = ordered.findIndex((post) => post.id === query.after);
    if (index < 0) {
      return { posts: [], hasMoreBefore: false, hasMoreAfter: false };
    }
    const newer = ordered.slice(index + 1);
    return {
      posts: newer.slice(0, limit),
      hasMoreBefore: true,
      hasMoreAfter: newer.length > limit,
    };
  }

  if (query.before) {
    const index = ordered.findIndex((post) => post.id === query.before);
    if (index < 0) {
      return { posts: [], hasMoreBefore: false, hasMoreAfter: false };
    }
    const older = ordered.slice(0, index);
    const page = older.slice(Math.max(0, older.length - limit));
    return {
      posts: page,
      hasMoreBefore: older.length > limit,
      hasMoreAfter: true,
    };
  }

  const page = ordered.slice(Math.max(0, ordered.length - limit));
  return {
    posts: page,
    hasMoreBefore: ordered.length > limit,
    hasMoreAfter: false,
  };
}

export function messageReadKeys(viewer: MessageViewer): string[] {
  const keys = [viewer.viewerKey];
  const stable = dmParticipantId(viewer);
  if (stable) keys.push(stable);
  return [...new Set(keys.filter((key) => key.trim()))];
}

export function listMessageChannelsOptions(viewer: MessageViewer) {
  return {
    readKeys: messageReadKeys(viewer),
    excludeAuthorLabel: dmAuthorLabel(viewer),
    excludeAuthorId: dmParticipantId(viewer),
  };
}

export function isOwnMessagePost(
  post: Pick<MessagePostRow, "author_label"> & { author_id?: string | null },
  viewer: { participantId?: string | null; authorLabel?: string | null },
) {
  const authorId = post.author_id?.trim();
  const participantId = viewer.participantId?.trim();
  if (authorId && participantId && authorId.toLowerCase() === participantId.toLowerCase()) {
    return true;
  }
  const label = viewer.authorLabel?.trim();
  if (label && post.author_label?.trim() === label) return true;
  return false;
}

export function unreadCountForChannel(
  channel: Pick<MessageChannelRow, "unread_count">,
  posts: Array<Pick<MessagePostRow, "created_at" | "author_label"> & { author_id?: string | null }>,
  input: { lastReadAt: string | null; participantId?: string | null; authorLabel?: string | null },
) {
  if (posts.length === 0) return Math.max(0, channel.unread_count);
  return posts.filter((post) => {
    if (isOwnMessagePost(post, input)) return false;
    if (!input.lastReadAt) return true;
    return post.created_at > input.lastReadAt;
  }).length;
}

/** Nav badge: unread DM posts only. Official unread stays on the inbox row. */
export function dmUnreadTotal(channels: MessageChannelRow[]) {
  return channels
    .filter((channel) => isInboxVisibleChannel(channel) && isDmChannel(channel))
    .reduce((sum, channel) => sum + Math.max(0, channel.unread_count), 0);
}

export function formatUnreadBadgeLabel(count: number) {
  if (count <= 0) return null;
  return count > UNREAD_BADGE_CAP ? `${UNREAD_BADGE_CAP}+` : String(count);
}

export function serializeMessageChannel(channel: MessageChannelRow, viewerAlumniId?: string | null) {
  return {
    id: channel.id,
    slug: channel.slug,
    name: isDmChannel(channel) ? dmDisplayName(channel, viewerAlumniId) : channel.name,
    kind: channel.kind,
    description: channel.description,
    is_pinned: channel.is_pinned,
    participant_a: channel.participant_a,
    participant_b: channel.participant_b,
    created_at: channel.created_at,
    last_post_at: channel.last_post_at,
    last_post_preview: channel.last_post_preview,
    last_read_at: channel.last_read_at,
    unread_count: channel.unread_count,
  };
}

export function jsonAccessDenied(input: {
  viewer: MessageViewer | null | undefined;
  channel: DmParticipantChannel | null | undefined;
  action: MessageChannelAccessAction;
}): MessageJsonError | null {
  if (!input.viewer) return { status: 401, error: "Unauthorized" };
  if (!input.channel || !isInboxVisibleChannel({ kind: input.channel.kind ?? "" })) {
    return { status: 404, error: "Channel not found" };
  }
  if (!canViewMessageChannel(input.channel, input.viewer)) {
    return { status: input.action === "read" ? 404 : 403, error: input.action === "read" ? "Channel not found" : "Forbidden" };
  }
  if (input.action === "post" && !canPostToMessageChannel(input.channel, input.viewer)) {
    return { status: 403, error: "Forbidden" };
  }
  return null;
}

export function isMessageableAlumniId(id: string | null | undefined) {
  const target = id?.trim() ?? "";
  if (!target || isPreviewAlumniId(target) || isLockerStubId(target)) return false;
  return true;
}
