-- Georgetown NetID on claimed alumni logins.
-- Runtime also applies this via ensureAlumniAuthTables(). Safe to re-run.
--
-- net_id is the local-part of @georgetown.edu (example: mak264@georgetown.edu → mak264).
-- Stored lowercase. Unique on lower(net_id) so it can be used as a login identifier
-- alongside email. NULL / blank stays allowed until the alum sets one.

ALTER TABLE alumni_accounts ADD COLUMN IF NOT EXISTS net_id text;

CREATE UNIQUE INDEX IF NOT EXISTS alumni_accounts_net_id_lower
ON alumni_accounts (lower(net_id))
WHERE net_id IS NOT NULL AND btrim(net_id) <> '';
