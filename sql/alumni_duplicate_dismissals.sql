-- Permanent "Not me" dismissals for likely-duplicate / Merge accounts.
-- Runtime also applies this via ensureAlumniDuplicateDismissalTable(). Safe to re-run.
--
-- Scope: one row per ordered alumni pair + actor.
--   claimed alum  → actor_key = account:{alumni_accounts.id} (or alumni:{alumni.id})
--   staff admin   → actor_key = admin:{username}
-- Pair never resurfaces for that actor after Not me. Merge path is unchanged.

CREATE TABLE IF NOT EXISTS alumni_duplicate_dismissals (
  alumni_id_low uuid NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
  alumni_id_high uuid NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
  actor_key text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (alumni_id_low, alumni_id_high, actor_key)
);

CREATE INDEX IF NOT EXISTS alumni_duplicate_dismissals_actor
ON alumni_duplicate_dismissals (actor_key);
