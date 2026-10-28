import { getCoachCredentials } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { adminUsernamesFromEnv } from "@/lib/roles";

let ensured = false;

/** Legacy silent seed usernames — remove when they are not linked or passworded. */
const LEGACY_SEED_ADMIN_USERNAMES = [
  "Lars",
  "Sgarlata",
  "Mike",
  "Michael",
  "Michael Kasten",
  "Hoyas",
] as const;

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
  await sql.query(`ALTER TABLE staff_roles ADD COLUMN IF NOT EXISTS alumni_id uuid`);
  await sql.query(`ALTER TABLE staff_roles ADD COLUMN IF NOT EXISTS password_hash text`);
  await sql.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS staff_roles_alumni_id
    ON staff_roles (alumni_id)
    WHERE alumni_id IS NOT NULL
  `);

  const coachUsername = getCoachCredentials().username;
  const presetAdmins = adminUsernamesFromEnv(coachUsername);
  for (const username of presetAdmins) {
    await sql.query(
      `
      INSERT INTO staff_roles (username, role)
      SELECT $1, 'owner'
      WHERE NOT EXISTS (
        SELECT 1 FROM staff_roles WHERE lower(username) = lower($1)
      )
      `,
      [username],
    );
  }

  // Drop legacy seed Admin rows that were never granted (no roster / password).
  const keep = presetAdmins.map((name) => name.toLowerCase());
  await sql.query(
    `
    DELETE FROM staff_roles
    WHERE role IN ('admin', 'owner')
      AND alumni_id IS NULL
      AND (password_hash IS NULL OR btrim(password_hash) = '')
      AND username IS NOT NULL
      AND btrim(username) <> ''
      AND lower(username) = ANY($1::text[])
      AND NOT (lower(username) = ANY($2::text[]))
    `,
    [LEGACY_SEED_ADMIN_USERNAMES.map((name) => name.toLowerCase()), keep],
  );

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
