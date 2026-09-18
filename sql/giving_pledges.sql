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
