-- Giving / Fundraising MVP (Coder 3 lane)
-- Probe first: only create if public.giving_pledges is missing.
-- Do not create or alter portal-owned fundraising_campaigns / fundraising_pledges.

-- Probe
-- SELECT to_regclass('public.giving_pledges');

CREATE TABLE IF NOT EXISTS giving_pledges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_cents integer NOT NULL,
  donor_label text,
  status text NOT NULL DEFAULT 'unpaid_intent',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS giving_pledges_created_at
  ON giving_pledges (created_at DESC);

-- Additive columns (also ensured at runtime in src/lib/giving-schema.ts)
ALTER TABLE giving_pledges ADD COLUMN IF NOT EXISTS alumni_id uuid;
ALTER TABLE giving_pledges ADD COLUMN IF NOT EXISTS designation text NOT NULL DEFAULT 'general';
ALTER TABLE giving_pledges ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS giving_pledges_alumni_id
  ON giving_pledges (alumni_id)
  WHERE alumni_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS giving_pledges_designation
  ON giving_pledges (designation);
