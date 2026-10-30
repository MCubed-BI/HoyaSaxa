import { getSql } from "@/lib/db";
import { canonicalizeSelectedIds, normalizeSelectionIds } from "@/lib/selection";

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  const rows = await sql.query(text, params);
  return rows as unknown as T;
}

/**
 * Map blast localStorage picks onto surviving alumni ids after merges / deletes.
 */
export async function resolveSelectedAlumniIds(rawIds: unknown) {
  const ids = normalizeSelectionIds(rawIds);
  if (ids.length === 0) return [] as string[];

  const existingRows = await query<Array<{ id: string }>>(
    `SELECT id::text AS id FROM alumni WHERE id = ANY($1::uuid[])`,
    [ids],
  );
  const existing = new Set(existingRows.map((row) => row.id));

  const missing = ids.filter((id) => !existing.has(id));
  const redirects = new Map<string, string>();
  if (missing.length > 0) {
    const mergeRows = await query<Array<{ merged_alumni_id: string; keeper_alumni_id: string }>>(
      `
      SELECT merged_alumni_id::text AS merged_alumni_id,
             keeper_alumni_id::text AS keeper_alumni_id
      FROM alumni_record_merges
      WHERE merged_alumni_id = ANY($1::uuid[])
      `,
      [missing],
    );
    for (const row of mergeRows) {
      if (row.merged_alumni_id && row.keeper_alumni_id) {
        redirects.set(row.merged_alumni_id, row.keeper_alumni_id);
      }
    }

    // Follow multi-hop merges (A→B→C) when intermediate keepers were later merged away.
    const redirectTargets = [...new Set(redirects.values())].filter((id) => !existing.has(id));
    if (redirectTargets.length > 0) {
      const hopRows = await query<Array<{ merged_alumni_id: string; keeper_alumni_id: string }>>(
        `
        SELECT merged_alumni_id::text AS merged_alumni_id,
               keeper_alumni_id::text AS keeper_alumni_id
        FROM alumni_record_merges
        WHERE merged_alumni_id = ANY($1::uuid[])
        `,
        [redirectTargets],
      );
      for (const row of hopRows) {
        if (row.merged_alumni_id && row.keeper_alumni_id) {
          redirects.set(row.merged_alumni_id, row.keeper_alumni_id);
        }
      }
      const neededKeepers = [
        ...new Set(
          [...redirects.values()].filter((id) => !existing.has(id) && !redirects.has(id)),
        ),
      ];
      if (neededKeepers.length > 0) {
        const keeperRows = await query<Array<{ id: string }>>(
          `SELECT id::text AS id FROM alumni WHERE id = ANY($1::uuid[])`,
          [neededKeepers],
        );
        for (const row of keeperRows) existing.add(row.id);
      }
    }

    // Ensure direct redirect keepers that weren't in the original pick list count as alive.
    const directKeepers = [...new Set(redirects.values())].filter((id) => !existing.has(id));
    if (directKeepers.length > 0) {
      const keeperRows = await query<Array<{ id: string }>>(
        `SELECT id::text AS id FROM alumni WHERE id = ANY($1::uuid[])`,
        [directKeepers],
      );
      for (const row of keeperRows) existing.add(row.id);
    }
  }

  return canonicalizeSelectedIds(ids, { existing, redirects });
}
