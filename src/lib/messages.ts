import { getSql } from "@/lib/db";
import type { MessageViewer } from "@/lib/messages-auth";
import {
  clampMessagePostsLimit,
  isInboxVisibleChannel,
  listMessageChannelsOptions,
  MESSAGE_POSTS_MAX_LIMIT,
  MESSAGE_POSTS_PAGE_SIZE,
  messageReadKeys,
  type MessagePostsPage,
  type MessagePostsQuery,
} from "@/lib/messages-api";
import { DM_CHANNEL_KIND, dmPair, dmParticipantId } from "@/lib/messages-dm";
import { ensureMessagesTables } from "@/lib/messages-schema";

export const MESSAGE_FILTERS = ["all", "unread", "groups"] as const;
export type MessageFilter = (typeof MESSAGE_FILTERS)[number];

export type MessageChannelRow = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  description: string | null;
  is_pinned: boolean;
  participant_a: string | null;
  participant_b: string | null;
  created_at: string;
  last_post_at: string | null;
  last_post_preview: string | null;
  last_read_at: string | null;
  unread_count: number;
};

export type MessagePostRow = {
  id: string;
  channel_id: string;
  title: string | null;
  body: string;
  author_role: string | null;
  author_label: string | null;
  created_at: string;
};

export type ListMessageChannelsOptions = {
  readKeys?: string[];
  excludeAuthorLabel?: string | null;
  excludeAuthorId?: string | null;
};

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

export function parseMessageFilter(value: string | string[] | undefined): MessageFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "unread" || raw === "groups") return raw;
  return "all";
}

export function isUnreadChannel(channel: Pick<MessageChannelRow, "unread_count">) {
  return channel.unread_count > 0;
}

export function isGroupChannel(channel: Pick<MessageChannelRow, "kind">) {
  return channel.kind === "group";
}

export function filterMessageChannels(channels: MessageChannelRow[], filter: MessageFilter) {
  const visible = channels.filter(isInboxVisibleChannel);
  if (filter === "unread") return visible.filter(isUnreadChannel);
  if (filter === "groups") return [];
  return visible;
}

export async function listMessageChannels(
  viewerKey: string,
  viewerAlumniId?: string | null,
  options?: ListMessageChannelsOptions,
) {
  await ensureMessagesTables();
  const readKeys = (options?.readKeys?.length ? options.readKeys : [viewerKey]).filter(Boolean);
  return query<MessageChannelRow[]>(
    `
    SELECT
      c.id,
      c.slug,
      c.name,
      c.kind,
      c.description,
      c.is_pinned,
      c.participant_a,
      c.participant_b,
      c.created_at,
      latest.created_at AS last_post_at,
      latest.body AS last_post_preview,
      r.last_read_at,
      COALESCE(unread.unread_count, 0)::int AS unread_count
    FROM message_channels c
    LEFT JOIN LATERAL (
      SELECT created_at, body
      FROM message_posts
      WHERE channel_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) latest ON true
    LEFT JOIN LATERAL (
      SELECT MAX(last_read_at) AS last_read_at
      FROM message_reads
      WHERE channel_id = c.id
        AND viewer_key = ANY($1::text[])
    ) r ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS unread_count
      FROM message_posts p
      WHERE p.channel_id = c.id
        AND (r.last_read_at IS NULL OR p.created_at > r.last_read_at)
        AND ($3::text IS NULL OR p.author_label IS DISTINCT FROM $3)
    ) unread ON true
    WHERE (
         c.kind IS DISTINCT FROM 'dm'
         AND c.kind IS DISTINCT FROM 'group'
       )
       OR (
         $2::text IS NOT NULL
         AND c.kind = 'dm'
         AND (
           lower(c.participant_a) = lower($2)
           OR lower(c.participant_b) = lower($2)
         )
       )
    ORDER BY c.is_pinned DESC, COALESCE(latest.created_at, c.created_at) DESC, c.name
    `,
    [readKeys, viewerAlumniId?.trim() || null, options?.excludeAuthorLabel?.trim() || null],
  );
}

export async function getMessageChannel(
  slug: string,
  viewerKey: string,
  viewerAlumniId?: string | null,
  options?: ListMessageChannelsOptions,
) {
  const channels = await listMessageChannels(viewerKey, viewerAlumniId, options);
  return channels.find((channel) => channel.slug === slug) ?? null;
}

export async function findOrCreateDmChannel(input: {
  fromAlumniId: string;
  toAlumniId: string;
  fromLabel: string;
  toLabel: string;
  viewerKey: string;
  listOptions?: ListMessageChannelsOptions;
}) {
  await ensureMessagesTables();
  const pair = dmPair(input.fromAlumniId, input.fromLabel, input.toAlumniId, input.toLabel);
  await query(
    `
    INSERT INTO message_channels (slug, name, kind, description, is_pinned, participant_a, participant_b)
    VALUES ($1, $2, $3, $4, false, $5, $6)
    ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        kind = EXCLUDED.kind,
        participant_a = EXCLUDED.participant_a,
        participant_b = EXCLUDED.participant_b
    `,
    [
      pair.slug,
      pair.name,
      DM_CHANNEL_KIND,
      `Direct message between ${pair.labelA} and ${pair.labelB}`,
      pair.participantA,
      pair.participantB,
    ],
  );
  const channel = await getMessageChannel(pair.slug, input.viewerKey, input.fromAlumniId, input.listOptions);
  if (!channel) {
    throw new Error("Could not open the direct message thread.");
  }
  return channel;
}

type ListPostsInput = number | Partial<MessagePostsQuery>;

function normalizePostsQuery(limitOrOptions: ListPostsInput = MESSAGE_POSTS_PAGE_SIZE): MessagePostsQuery {
  if (typeof limitOrOptions === "number") {
    return { limit: clampMessagePostsLimit(limitOrOptions, MESSAGE_POSTS_MAX_LIMIT) };
  }
  return {
    after: limitOrOptions.after?.trim() || undefined,
    before: limitOrOptions.after ? undefined : limitOrOptions.before?.trim() || undefined,
    limit: clampMessagePostsLimit(limitOrOptions.limit, MESSAGE_POSTS_PAGE_SIZE),
  };
}

const POST_COLUMNS = "id, channel_id, title, body, author_role, author_label, created_at";

export async function listMessagePostsPage(
  channelId: string,
  limitOrOptions: ListPostsInput = MESSAGE_POSTS_PAGE_SIZE,
): Promise<MessagePostsPage> {
  await ensureMessagesTables();
  const queryOpts = normalizePostsQuery(limitOrOptions);
  const fetchLimit = queryOpts.limit + 1;

  if (queryOpts.after) {
    const rows = await query<MessagePostRow[]>(
      `
      SELECT ${POST_COLUMNS}
      FROM message_posts
      WHERE channel_id = $1
        AND EXISTS (
          SELECT 1 FROM message_posts cursor_post
          WHERE cursor_post.id = $2 AND cursor_post.channel_id = $1
        )
        AND (created_at, id) > (
          SELECT created_at, id FROM message_posts WHERE id = $2 AND channel_id = $1
        )
      ORDER BY created_at ASC, id ASC
      LIMIT $3
      `,
      [channelId, queryOpts.after, fetchLimit],
    );
    const hasMoreAfter = rows.length > queryOpts.limit;
    return {
      posts: hasMoreAfter ? rows.slice(0, queryOpts.limit) : rows,
      hasMoreBefore: true,
      hasMoreAfter,
    };
  }

  if (queryOpts.before) {
    const rows = await query<MessagePostRow[]>(
      `
      SELECT ${POST_COLUMNS}
      FROM (
        SELECT ${POST_COLUMNS}
        FROM message_posts
        WHERE channel_id = $1
          AND EXISTS (
            SELECT 1 FROM message_posts cursor_post
            WHERE cursor_post.id = $2 AND cursor_post.channel_id = $1
          )
          AND (created_at, id) < (
            SELECT created_at, id FROM message_posts WHERE id = $2 AND channel_id = $1
          )
        ORDER BY created_at DESC, id DESC
        LIMIT $3
      ) older
      ORDER BY created_at ASC, id ASC
      `,
      [channelId, queryOpts.before, fetchLimit],
    );
    const hasMoreBefore = rows.length > queryOpts.limit;
    const posts = hasMoreBefore ? rows.slice(rows.length - queryOpts.limit) : rows;
    return {
      posts,
      hasMoreBefore,
      hasMoreAfter: true,
    };
  }

  const rows = await query<MessagePostRow[]>(
    `
    SELECT ${POST_COLUMNS}
    FROM (
      SELECT ${POST_COLUMNS}
      FROM message_posts
      WHERE channel_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    ) latest
    ORDER BY created_at ASC, id ASC
    `,
    [channelId, fetchLimit],
  );
  const hasMoreBefore = rows.length > queryOpts.limit;
  const posts = hasMoreBefore ? rows.slice(rows.length - queryOpts.limit) : rows;
  return {
    posts,
    hasMoreBefore,
    hasMoreAfter: false,
  };
}

export async function listMessagePosts(channelId: string, limitOrOptions: ListPostsInput = MESSAGE_POSTS_MAX_LIMIT) {
  const page = await listMessagePostsPage(channelId, limitOrOptions);
  return page.posts;
}

export async function createMessagePost(input: {
  channelId: string;
  title?: string;
  body: string;
  authorRole: string;
  authorLabel: string;
}) {
  await ensureMessagesTables();
  const rows = await query<MessagePostRow[]>(
    `
    INSERT INTO message_posts (channel_id, title, body, author_role, author_label)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, channel_id, title, body, author_role, author_label, created_at
    `,
    [input.channelId, input.title?.trim() || null, input.body.trim(), input.authorRole, input.authorLabel],
  );
  return rows[0];
}

export async function markChannelRead(channelId: string, viewerKey: string) {
  await ensureMessagesTables();
  await query(
    `
    INSERT INTO message_reads (viewer_key, channel_id, last_read_at)
    VALUES ($1, $2, now())
    ON CONFLICT (viewer_key, channel_id)
    DO UPDATE SET last_read_at = now()
    `,
    [viewerKey, channelId],
  );
}

/** Dual-write session key + stable participant id. See MESSAGE_READ_KEY_NOTE. */
export async function markChannelReadKeys(channelId: string, keys: string[]) {
  const unique = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  for (const key of unique) {
    await markChannelRead(channelId, key);
  }
}

export async function listViewerMessageChannels(viewer: MessageViewer) {
  return listMessageChannels(viewer.viewerKey, dmParticipantId(viewer), listMessageChannelsOptions(viewer));
}

export async function getViewerMessageChannel(slug: string, viewer: MessageViewer) {
  return getMessageChannel(slug, viewer.viewerKey, dmParticipantId(viewer), listMessageChannelsOptions(viewer));
}

export async function markChannelReadForViewer(channelId: string, viewer: MessageViewer) {
  await markChannelReadKeys(channelId, messageReadKeys(viewer));
}
