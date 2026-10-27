import { getSql } from "@/lib/db";

let ensured = false;

/** Affiliation + admin verification columns on `alumni`. */
export async function ensurePersonColumns() {
  if (ensured) return;
  const sql = getSql();
  await sql.query(`
    ALTER TABLE alumni
      ADD COLUMN IF NOT EXISTS person_kind text NOT NULL DEFAULT 'alum',
      ADD COLUMN IF NOT EXISTS admin_verified boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS admin_verified_at timestamptz,
      ADD COLUMN IF NOT EXISTS admin_verified_by text
  `);
  await sql.query(`ALTER TABLE alumni DROP CONSTRAINT IF EXISTS alumni_person_kind_check`);
  await sql.query(`
    ALTER TABLE alumni
      ADD CONSTRAINT alumni_person_kind_check
      CHECK (person_kind IN ('alum', 'supporter', 'development'))
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_alumni_person_kind ON alumni (person_kind)
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_alumni_admin_verified ON alumni (admin_verified)
    WHERE admin_verified = false
  `);
  ensured = true;
}

export function resetPersonColumnsCache() {
  ensured = false;
}
