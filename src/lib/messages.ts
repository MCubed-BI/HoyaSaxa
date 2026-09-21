import { getSql } from "@/lib/db";
import { DM_CHANNEL_KIND, dmChannelSlug, isDmChannel } from "@/lib/messages-dm";
import { ensureMessagesTables } from "@/lib/messages-schema";

export const MESSAGE_FILTERS = ["all", "unread", "groups", "direct"] as const;
export type MessageFilter = (typeof MESSAGE_FILTERS)[number];

export type MessageChannelRow = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  description: string | null;
  is_pinned: boolean;
  created_at: string;
  last_post_at: string | null;
  last_post_preview: string | null;
  last_read_at: string | null;
  unread_count: number;
  peer_alumni_id?: string | null;
  peer_name?: string | null;
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
  if (raw === "unread" || raw === "groups" || raw === "direct") return raw;
  return "all";
}

export function isUnreadChannel(channel: Pick<MessageChannelRow, "unread_count">) {
  return channel.unread_count > 0;
}

export function isGroupChannel(channel: Pick<MessageChannelRow, "kind">) {
  return channel.kind === "group";
}

export function isDirectChannel(channel: Pick<MessageChannelRow, "kind" | "slug">) {
  return isDmChannel(channel);
}

export function filterMessageChannels(channels: MessageChannelRow[], filter: MessageFilter) {
  if (filter === "unread") return channels.filter(isUnreadChannel);
  if (filter === "groups") return channels.filter(isGroupChannel);
  if (filter === "direct") return channels.filter(isDirectChannel);
  return channels;
}

export function inboxChannelTitle(channel: Pick<MessageChannelRow, "name" | "kind" | "peer_name">) {
  if (isDmChannel(channel) && channel.peer_name?.trim()) return channel.peer_name.trim();
  return channel.name;
}

export async function listMessageChannels(viewerKey: string, viewerAlumniId?: string | null) {
  await ensureMessagesTables();
  const alumniId = viewerAlumniId?.trim() || null;
  return query<MessageChannelRow[]>(
    `
    SELECT
      c.id,
      c.slug,
      c.name,
      c.kind,
      c.description,
      c.is_pinned,
      c.created_at,
      latest.created_at AS last_post_at,
      latest.body AS last_post_preview,
      r.last_read_at,
      COALESCE(unread.unread_count, 0)::int AS unread_count,
      peer.alumni_id AS peer_alumni_id,
      peer.display_name AS peer_name
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
    LEFT JOIN LATERAL (
      SELECT m.alumni_id, m.display_name
      FROM message_channel_members m
      WHERE m.channel_id = c.id
        AND ($2::text IS NULL OR lower(m.alumni_id) <> lower($2))
      ORDER BY m.alumni_id
      LIMIT 1
    ) peer ON true
    WHERE c.kind <> '${DM_CHANNEL_KIND}'
       OR (
         $2::text IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM message_channel_members m
           WHERE m.channel_id = c.id
             AND lower(m.alumni_id) = lower($2)
         )
       )
    ORDER BY c.is_pinned DESC, COALESCE(latest.created_at, c.created_at) DESC, c.name
    `,
    [viewerKey, alumniId],
  );
}

export async function getMessageChannel(slug: string, viewerKey: string, viewerAlumniId?: string | null) {
  const channels = await listMessageChannels(viewerKey, viewerAlumniId);
  return channels.find((channel) => channel.slug === slug) ?? null;
}

export async function findOrCreateDmChannel(input: {
  sender: { alumniId: string; name: string };
  recipient: { alumniId: string; name: string };
}) {
  await ensureMessagesTables();
  const slug = dmChannelSlug(input.sender.alumniId, input.recipient.alumniId);
  const names = [input.sender.name.trim() || "Alumnus", input.recipient.name.trim() || "Alumnus"];
  const channelName = [...names].sort((a, b) => a.localeCompare(b)).join(" · ");

  await query(
    `
    INSERT INTO message_channels (slug, name, kind, description, is_pinned)
    VALUES ($1, $2, $3, $4, false)
    ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        kind = EXCLUDED.kind,
        description = EXCLUDED.description
    `,
    [slug, channelName, DM_CHANNEL_KIND, `Direct message · ${channelName}`],
  );

  const rows = await query<Array<{ id: string; slug: string }>>(
    `SELECT id, slug FROM message_channels WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  const channel = rows[0];
  if (!channel) {
    throw new Error("Could not open that conversation.");
  }

  await query(
    `
    INSERT INTO message_channel_members (channel_id, alumni_id, display_name)
    VALUES ($1, $2, $3), ($1, $4, $5)
    ON CONFLICT (channel_id, alumni_id)
    DO UPDATE SET display_name = EXCLUDED.display_name
    `,
    [
      channel.id,
      input.sender.alumniId,
      input.sender.name.trim() || "Alumnus",
      input.recipient.alumniId,
      input.recipient.name.trim() || "Alumnus",
    ],
  );

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
