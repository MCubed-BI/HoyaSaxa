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

-- Only the coach preset is seeded as Admin. Grant others via /admin or HOYA_ADMIN_USERNAMES.
INSERT INTO staff_roles (username, role)
SELECT seed.username, 'owner'
FROM (VALUES ('Hoyas')) AS seed(username)
WHERE NOT EXISTS (
  SELECT 1 FROM staff_roles existing
  WHERE lower(existing.username) = lower(seed.username)
);

-- Remove legacy silent seed Admins that were never explicitly granted.
DELETE FROM staff_roles
WHERE role IN ('admin', 'owner')
  AND alumni_id IS NULL
  AND (password_hash IS NULL OR btrim(password_hash) = '')
  AND username IS NOT NULL
  AND lower(username) IN ('lars', 'sgarlata', 'mike', 'michael', 'michael kasten')
  AND lower(username) <> lower('Hoyas');
