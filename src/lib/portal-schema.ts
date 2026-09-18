import { getSql } from "@/lib/db";

let ensured = false;

export async function ensurePortalTables() {
  if (ensured) return;
  const sql = getSql();

  await sql.query(`
    CREATE TABLE IF NOT EXISTS staff_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username text,
      email text,
      role text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS staff_roles_username_lower
    ON staff_roles (lower(username))
    WHERE username IS NOT NULL AND btrim(username) <> ''
  `);
  await sql.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS staff_roles_email_lower
    ON staff_roles (lower(email))
    WHERE email IS NOT NULL AND btrim(email) <> ''
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS coach_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text,
      body text NOT NULL,
      author_role text,
      author_label text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS coach_messages_created_at
    ON coach_messages (created_at DESC)
  `);

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
    CREATE TABLE IF NOT EXISTS fundraising_campaigns (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text,
      goal_cents integer,
      donate_url text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS fundraising_pledges (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id uuid REFERENCES fundraising_campaigns(id) ON DELETE SET NULL,
      alumni_id uuid,
      name text,
      email text,
      amount_cents integer,
      note text,
      source text NOT NULL DEFAULT 'intent',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS fundraising_pledges_campaign
    ON fundraising_pledges (campaign_id, created_at DESC)
  `);

  const campaigns = await sql.query(`SELECT id FROM fundraising_campaigns LIMIT 1`);
  if ((campaigns as unknown[]).length === 0) {
    await sql.query(
      `
      INSERT INTO fundraising_campaigns (title, description, donate_url, is_active)
      VALUES ($1, $2, $3, true)
      `,
      [
        "Hoya Football Fund",
        "Support Georgetown Football alumni programming, recruiting visits, and student-athlete needs. Stripe checkout is not wired yet — record a pledge intent here or use the labeled mailto placeholder.",
        "mailto:football@guhoyas.com?subject=Hoya%20Football%20Fund%20pledge",
      ],
    );
  }

  ensured = true;
}
