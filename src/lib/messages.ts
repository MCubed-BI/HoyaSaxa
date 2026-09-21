import { getSql } from "@/lib/db";
import { DM_CHANNEL_KIND, dmPair } from "@/lib/messages-dm";
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
  if (filter === "unread") return channels.filter(isUnreadChannel);
  if (filter === "groups") return channels.filter(isGroupChannel);
  return channels;
}

export async function listMessageChannels(viewerKey: string, viewerAlumniId?: string | null) {
  await ensureMessagesTables();
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
    LEFT JOIN message_reads r
      ON r.channel_id = c.id AND r.viewer_key = $1
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS unread_count
      FROM message_posts p
      WHERE p.channel_id = c.id
        AND (r.last_read_at IS NULL OR p.created_at > r.last_read_at)
    ) unread ON true
    WHERE c.kind IS DISTINCT FROM 'dm'
       OR (
         $2::text IS NOT NULL
         AND (
           lower(c.participant_a) = lower($2)
           OR lower(c.participant_b) = lower($2)
         )
       )
    ORDER BY c.is_pinned DESC, COALESCE(latest.created_at, c.created_at) DESC, c.name
    `,
    [viewerKey, viewerAlumniId?.trim() || null],
  );
}

export async function getMessageChannel(slug: string, viewerKey: string, viewerAlumniId?: string | null) {
  const channels = await listMessageChannels(viewerKey, viewerAlumniId);
  return channels.find((channel) => channel.slug === slug) ?? null;
}

export async function findOrCreateDmChannel(input: {
  fromAlumniId: string;
  toAlumniId: string;
  fromLabel: string;
  toLabel: string;
  viewerKey: string;
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
  const channel = await getMessageChannel(pair.slug, input.viewerKey, input.fromAlumniId);
  if (!channel) {
    throw new Error("Could not open the direct message thread.");
  }
  return channel;
}

export async function listMessagePosts(channelId: string, limit = 80) {
  await ensureMessagesTables();
  return query<MessagePostRow[]>(
    `
    SELECT id, channel_id, title, body, author_role, author_label, created_at
    FROM message_posts
    WHERE channel_id = $1
    ORDER BY created_at ASC
    LIMIT $2
    `,
    [channelId, limit],
  );
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
