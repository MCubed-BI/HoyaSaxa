-- Additive platform contracts (roles / feed / badges / photos).
-- Runtime also applies these via ensure* helpers. Safe to re-run.

ALTER TABLE alumni ADD COLUMN IF NOT EXISTS football_photo_url text;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS linkedin_photo_url text;

ALTER TABLE locker_feed_posts ADD COLUMN IF NOT EXISTS section text;

CREATE TABLE IF NOT EXISTS alum_badges (
  alumni_id uuid NOT NULL,
  badge_type text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (alumni_id, badge_type)
);

CREATE TABLE IF NOT EXISTS event_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  alumni_id uuid,
  attendee_key text,
  checked_in_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO staff_roles (username, role)
SELECT seed.username, 'admin'
FROM (VALUES ('Lars'), ('Sgarlata'), ('Hoyas'), ('Mike')) AS seed(username)
WHERE NOT EXISTS (
  SELECT 1 FROM staff_roles existing
  WHERE lower(existing.username) = lower(seed.username)
);
