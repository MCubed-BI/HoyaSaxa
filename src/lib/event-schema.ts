import { getSql } from "@/lib/db";

export async function ensureEventTables() {
  const sql = getSql();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      category text NOT NULL,
      starts_at timestamptz NOT NULL,
      location text,
      thumbnail_url text,
      description text,
      created_by text NOT NULL,
      created_by_role text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS event_rsvps (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      attendee_key text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (event_id, attendee_key)
    )
  `);
  // PR #17 stub contract — Coder 3 computeEventTopBadge reads this table.
  await sql.query(`
    CREATE TABLE IF NOT EXISTS event_checkins (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      alumni_id uuid,
      attendee_key text,
      checked_in_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`ALTER TABLE event_checkins ADD COLUMN IF NOT EXISTS display_name text`);
  await sql.query(`ALTER TABLE event_checkins ADD COLUMN IF NOT EXISTS checked_in_by text`);
  await sql.query(`ALTER TABLE event_checkins ADD COLUMN IF NOT EXISTS source text`);
  // When false (default), alums show a QR and an admin must scan to check them in.
  await sql.query(
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS self_check_in_allowed boolean NOT NULL DEFAULT false`,
  );
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events (starts_at)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_events_created_by ON events (created_by)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_event_rsvps_attendee ON event_rsvps (attendee_key)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_event_checkins_alumni ON event_checkins (alumni_id)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_event_checkins_event ON event_checkins (event_id)`);
  await sql.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS event_checkins_event_attendee
    ON event_checkins (event_id, attendee_key)
    WHERE attendee_key IS NOT NULL
  `);
}

/** Kept for call-site compatibility. Never inserts demo/smoke events. */
export async function seedDemoEventsIfEmpty() {
  await ensureEventTables();
}
