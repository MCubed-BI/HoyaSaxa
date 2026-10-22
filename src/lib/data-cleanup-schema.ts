import { getSql } from "@/lib/db";

let ensured = false;

export async function ensureDataCleanupTables() {
  if (ensured) return;
  const sql = getSql();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS alumni_cleanup_suggestions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      keeper_id uuid NOT NULL,
      source_id uuid NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      origin text NOT NULL DEFAULT 'heuristic',
      confidence real,
      reason text,
      ai_reason text,
      decided_by text,
      decided_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CHECK (keeper_id <> source_id),
      CHECK (status IN ('pending', 'approved', 'rejected')),
      CHECK (origin IN ('heuristic', 'ai'))
    )
  `);
  await sql.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS alumni_cleanup_suggestions_pending_pair
    ON alumni_cleanup_suggestions (
      LEAST(keeper_id, source_id),
      GREATEST(keeper_id, source_id)
    )
    WHERE status = 'pending'
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS alumni_cleanup_suggestions_status
    ON alumni_cleanup_suggestions (status, created_at DESC)
  `);
  ensured = true;
}
