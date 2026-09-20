import { getSql } from "@/lib/db";

let ensured = false;

const SEED_NEWSFLASH = [
  {
    title: "Homecoming weekend at Cooper Field",
    body: "Lars: board hosts a Legacy Locker gathering after the homecoming kick. Details land here first — bring a classmate.",
    eventAt: "2026-10-17T16:00:00.000Z",
    authorLabel: "Lars",
  },
  {
    title: "Newsflash is live",
    body: "Board notes, game-week updates, and locker announcements now publish here. Alumni can read every post; only board can write.",
    eventAt: null,
    authorLabel: "Lars",
  },
];

const SEED_FEED = [
  {
    authorLabel: "Georgetown Football",
    authorRole: "official",
    audience: "for-you",
    title: "Fall camp notes",
    body: "Official: fall camp wraps this week. Watch Newsflash for the board’s homecoming plan.",
  },
  {
    authorLabel: "Pat Hoya ’15",
    authorRole: "alum",
    audience: "alumni",
    title: "Who’s in D.C. Friday?",
    body: "In town for a client dinner. Anyone around Dupont want to grab a Hoya pint?",
  },
];

export async function ensureLockerTables() {
  if (ensured) return;
  const sql = getSql();

  await sql.query(`
    CREATE TABLE IF NOT EXISTS newsflash_posts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      body text NOT NULL,
      event_at timestamptz,
      author_label text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS newsflash_posts_created_at
    ON newsflash_posts (created_at DESC)
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS newsflash_posts_event_at
    ON newsflash_posts (event_at)
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS locker_feed_posts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      author_label text NOT NULL,
      author_role text NOT NULL DEFAULT 'alum',
      audience text NOT NULL DEFAULT 'alumni',
      title text,
      body text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS locker_feed_posts_created_at
    ON locker_feed_posts (created_at DESC)
  `);
  await sql.query(`ALTER TABLE locker_feed_posts ADD COLUMN IF NOT EXISTS section text`);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS locker_feed_posts_section
    ON locker_feed_posts (section, created_at DESC)
  `);

  const newsflashCount = (await sql.query(`SELECT id FROM newsflash_posts LIMIT 1`)) as unknown[];
  if (newsflashCount.length === 0) {
    for (const post of SEED_NEWSFLASH) {
      await sql.query(
        `
        INSERT INTO newsflash_posts (title, body, event_at, author_label)
        VALUES ($1, $2, $3, $4)
        `,
        [post.title, post.body, post.eventAt, post.authorLabel],
      );
    }
  }

  const feedCount = (await sql.query(`SELECT id FROM locker_feed_posts LIMIT 1`)) as unknown[];
  if (feedCount.length === 0) {
    for (const post of SEED_FEED) {
      await sql.query(
        `
        INSERT INTO locker_feed_posts (author_label, author_role, audience, title, body)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [post.authorLabel, post.authorRole, post.audience, post.title, post.body],
      );
    }
  }

  ensured = true;
}
