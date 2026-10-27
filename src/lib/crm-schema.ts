import { getSql } from "@/lib/db";

let ensured = false;

/** Per-contact CRM notes (donation call log and freeform notes). */
export async function ensureContactNotesTable() {
  if (ensured) return;
  const sql = getSql();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS contact_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      alumni_id uuid NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
      kind text NOT NULL DEFAULT 'donation_call',
      body text NOT NULL,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'contact_notes_kind_check'
      ) THEN
        ALTER TABLE contact_notes
          ADD CONSTRAINT contact_notes_kind_check
          CHECK (kind IN ('donation_call', 'note'));
      END IF;
    END $$;
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS contact_notes_alumni_id_created_at
    ON contact_notes (alumni_id, created_at DESC)
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS contact_notes_alumni_id_kind
    ON contact_notes (alumni_id, kind)
  `);
  ensured = true;
}

export function resetContactNotesTableCache() {
  ensured = false;
}
