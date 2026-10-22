import { getSql } from "@/lib/db";

let ensured = false;

/** Create locker tables only — never seed demo/smoke posts into an empty DB. */
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

  ensured = true;
}
