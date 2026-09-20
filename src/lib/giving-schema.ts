import { getSql } from "@/lib/db";

/**
 * Giving / Fundraising MVP table. Coder 3 lane.
 * Do not reuse or alter portal `fundraising_pledges` / `fundraising_campaigns`.
 */
export const GIVING_PLEDGES_TABLE = "giving_pledges";

let ensured = false;

async function tableExists(tableName: string) {
  const sql = getSql();
  const rows = (await sql.query(
    `SELECT to_regclass($1) AS name`,
    [`public.${tableName}`],
  )) as Array<{ name: string | null }>;
  return Boolean(rows[0]?.name);
}

export async function ensureGivingPledgesTable() {
  if (ensured) return;
  const sql = getSql();

  if (!(await tableExists(GIVING_PLEDGES_TABLE))) {
    await sql.query(`
      CREATE TABLE IF NOT EXISTS giving_pledges (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        amount_cents integer NOT NULL,
        donor_label text,
        status text NOT NULL DEFAULT 'unpaid_intent',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await sql.query(`
      CREATE INDEX IF NOT EXISTS giving_pledges_created_at
      ON giving_pledges (created_at DESC)
    `);
  }

  await sql.query(`ALTER TABLE giving_pledges ADD COLUMN IF NOT EXISTS alumni_id uuid`);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS giving_pledges_alumni_id
    ON giving_pledges (alumni_id)
    WHERE alumni_id IS NOT NULL
  `);

  ensured = true;
}
