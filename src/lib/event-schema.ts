import { getCoachCredentials } from "@/lib/auth";
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
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events (starts_at)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_events_created_by ON events (created_by)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_event_rsvps_attendee ON event_rsvps (attendee_key)`);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS event_checkins (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      alumni_id uuid,
      attendee_key text,
      checked_in_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_event_checkins_alumni ON event_checkins (alumni_id)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_event_checkins_event ON event_checkins (event_id)`);
}

export async function seedDemoEventsIfEmpty() {
  const sql = getSql();
  const existing = (await sql.query(`SELECT count(*)::int AS count FROM events`)) as { count: number }[];
  if ((existing[0]?.count ?? 0) > 0) return;

  const createdBy = getCoachCredentials().username;
  await sql.query(
    `
      INSERT INTO events (title, category, starts_at, location, thumbnail_url, description, created_by, created_by_role)
      VALUES
        (
          'Homecoming Tailgate',
          'Social',
          now() + interval '18 days',
          'Cooper Field, Georgetown',
          NULL,
          NULL,
          $1,
          'coach'
        ),
        (
          'Board and coach reception',
          'Meeting',
          now() + interval '32 days',
          'Leavey Center',
          NULL,
          NULL,
          $1,
          'coach'
        ),
        (
          'Alumni reunion weekend',
          'Reunion',
          now() + interval '55 days',
          'McDonough Arena',
          NULL,
          NULL,
          $1,
          'coach'
        ),
        (
          'Spring game',
          'Game',
          now() - interval '21 days',
          'Multi-Sport Field',
          NULL,
          NULL,
          $1,
          'coach'
        ),
        (
          'Alumni fundraiser',
          'Fundraiser',
          now() - interval '64 days',
          'Downtown DC',
          NULL,
          NULL,
          $1,
          'coach'
        )
    `,
    [createdBy],
  );
}
