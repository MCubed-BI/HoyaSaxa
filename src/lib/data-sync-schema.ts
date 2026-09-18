import { getSql } from "@/lib/db";

export async function ensureDataSyncTable() {
  const sql = getSql();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS data_sync (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      filename text NOT NULL,
      content_type text,
      status text NOT NULL DEFAULT 'staged',
      sheet_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
      preview jsonb NOT NULL DEFAULT '{}'::jsonb,
      payload jsonb NOT NULL DEFAULT '[]'::jsonb,
      row_count integer NOT NULL DEFAULT 0,
      insert_count integer NOT NULL DEFAULT 0,
      update_count integer NOT NULL DEFAULT 0,
      email_count integer NOT NULL DEFAULT 0,
      phone_count integer NOT NULL DEFAULT 0,
      roster_count integer NOT NULL DEFAULT 0,
      apply_offset integer NOT NULL DEFAULT 0,
      applied_insert_count integer NOT NULL DEFAULT 0,
      applied_update_count integer NOT NULL DEFAULT 0,
      applied_email_count integer NOT NULL DEFAULT 0,
      applied_phone_count integer NOT NULL DEFAULT 0,
      applied_roster_count integer NOT NULL DEFAULT 0,
      errors jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      applied_at timestamptz
    )
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_data_sync_created_at ON data_sync (created_at DESC)
  `);
}
