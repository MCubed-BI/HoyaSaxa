import { getSql } from "@/lib/db";
import { SGARLATA_CHANNEL_SLUG } from "@/lib/messages-auth";

const SEEDED_CHANNELS = [
  {
    slug: SGARLATA_CHANNEL_SLUG,
    name: "Message from Sgarlata",
    kind: "official",
    description: "Official notes from Head Coach Sgarlata. Staff post; alumni read only.",
    isPinned: true,
  },
  {
    slug: "class-2015",
    name: "Class of 2015",
    kind: "group",
    description: "Classmates from the 2015 roster.",
    isPinned: false,
  },
  {
    slug: "d-line",
    name: "D-Line",
    kind: "group",
    description: "Defensive line alumni group.",
    isPinned: false,
  },
  {
    slug: "captains",
    name: "Captains",
    kind: "group",
    description: "Program captains and leadership.",
    isPinned: false,
  },
] as const;

let ensured = false;

export async function ensureMessagesTables() {
  if (ensured) return;
  const sql = getSql();

  await sql.query(`
    CREATE TABLE IF NOT EXISTS message_channels (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      kind text NOT NULL DEFAULT 'group',
      description text,
      is_pinned boolean NOT NULL DEFAULT false,
      participant_a text,
      participant_b text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
    ALTER TABLE message_channels
      ADD COLUMN IF NOT EXISTS participant_a text
  `);
  await sql.query(`
    ALTER TABLE message_channels
      ADD COLUMN IF NOT EXISTS participant_b text
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS message_channels_dm_participants
    ON message_channels (participant_a, participant_b)
    WHERE kind = 'dm'
  `);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS message_posts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      channel_id uuid NOT NULL REFERENCES message_channels(id) ON DELETE CASCADE,
      title text,
      body text NOT NULL,
      author_role text,
      author_label text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS message_posts_channel_created
    ON message_posts (channel_id, created_at DESC)
  `);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS message_reads (
      viewer_key text NOT NULL,
      channel_id uuid NOT NULL REFERENCES message_channels(id) ON DELETE CASCADE,
      last_read_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (viewer_key, channel_id)
    )
  `);

  for (const channel of SEEDED_CHANNELS) {
    await sql.query(
      `
      INSERT INTO message_channels (slug, name, kind, description, is_pinned)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name,
          kind = EXCLUDED.kind,
          description = EXCLUDED.description,
          is_pinned = EXCLUDED.is_pinned
      `,
      [channel.slug, channel.name, channel.kind, channel.description, channel.isPinned],
    );
  }

  const welcome = await sql.query(
    `
    SELECT p.id
    FROM message_posts p
    JOIN message_channels c ON c.id = p.channel_id
    WHERE c.slug = $1
    LIMIT 1
    `,
    [SGARLATA_CHANNEL_SLUG],
  );
  if ((welcome as unknown[]).length === 0) {
    await sql.query(
      `
      INSERT INTO message_posts (channel_id, title, body, author_role, author_label)
      SELECT id, $1, $2, 'coach', 'Coach Sgarlata'
      FROM message_channels
      WHERE slug = $3
      `,
      [
        "Welcome",
        "Official notes from Coach Sgarlata. Staff can write; alumni read along.",
        SGARLATA_CHANNEL_SLUG,
      ],
    );
  }

  ensured = true;
}
