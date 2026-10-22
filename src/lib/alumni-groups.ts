import { ensureAlumniGroupsTables } from "@/lib/alumni-groups-schema";
import { getSql } from "@/lib/db";

export type AlumniGroupSummary = {
  id: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
};

export type AlumniGroupMember = {
  alumniId: string;
  name: string;
};

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  const rows = await sql.query(text, params);
  return rows as unknown as T;
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export async function listAlumniGroups(): Promise<AlumniGroupSummary[]> {
  await ensureAlumniGroupsTables();
  return query<AlumniGroupSummary[]>(
    `
    SELECT
      g.id,
      g.name,
      g.description,
      g.created_by AS "createdBy",
      g.created_at AS "createdAt",
      g.updated_at AS "updatedAt",
      COUNT(m.alumni_id)::int AS "memberCount"
    FROM alumni_groups g
    LEFT JOIN alumni_group_members m ON m.group_id = g.id
    GROUP BY g.id
    ORDER BY lower(g.name)
    `,
  );
}

export async function getAlumniGroup(id: string): Promise<AlumniGroupSummary | null> {
  await ensureAlumniGroupsTables();
  const rows = await query<AlumniGroupSummary[]>(
    `
    SELECT
      g.id,
      g.name,
      g.description,
      g.created_by AS "createdBy",
      g.created_at AS "createdAt",
      g.updated_at AS "updatedAt",
      COUNT(m.alumni_id)::int AS "memberCount"
    FROM alumni_groups g
    LEFT JOIN alumni_group_members m ON m.group_id = g.id
    WHERE g.id = $1::uuid
    GROUP BY g.id
    `,
    [id],
  );
  return rows[0] ?? null;
}

export async function createAlumniGroup(input: {
  name: string;
  description?: string | null;
  createdBy?: string | null;
  memberIds?: string[];
}): Promise<AlumniGroupSummary> {
  await ensureAlumniGroupsTables();
  const name = normalizeName(input.name);
  if (!name) throw new Error("Group name is required.");
  if (name.length > 80) throw new Error("Group name is too long (80 character max).");

  const created = await query<Array<{ id: string }>>(
    `
    INSERT INTO alumni_groups (name, description, created_by)
    VALUES ($1, $2, $3)
    RETURNING id
    `,
    [name, input.description?.trim() || null, input.createdBy?.trim() || null],
  );
  const id = created[0]!.id;
  const memberIds = normalizeIds(input.memberIds ?? []);
  if (memberIds.length) {
    await addAlumniGroupMembers(id, memberIds);
  }
  const group = await getAlumniGroup(id);
  if (!group) throw new Error("Group was created but could not be loaded.");
  return group;
}

export async function renameAlumniGroup(id: string, name: string) {
  await ensureAlumniGroupsTables();
  const next = normalizeName(name);
  if (!next) throw new Error("Group name is required.");
  if (next.length > 80) throw new Error("Group name is too long (80 character max).");
  const rows = await query<Array<{ id: string }>>(
    `
    UPDATE alumni_groups
    SET name = $2, updated_at = now()
    WHERE id = $1::uuid
    RETURNING id
    `,
    [id, next],
  );
  if (!rows[0]) throw new Error("Group not found.");
  return getAlumniGroup(id);
}

export async function deleteAlumniGroup(id: string) {
  await ensureAlumniGroupsTables();
  const rows = await query<Array<{ id: string }>>(
    `DELETE FROM alumni_groups WHERE id = $1::uuid RETURNING id`,
    [id],
  );
  return Boolean(rows[0]);
}

export async function listAlumniGroupMembers(groupId: string): Promise<AlumniGroupMember[]> {
  await ensureAlumniGroupsTables();
  return query<AlumniGroupMember[]>(
    `
    SELECT
      m.alumni_id AS "alumniId",
      COALESCE(
        NULLIF(btrim(a.full_name), ''),
        NULLIF(btrim(concat_ws(' ', a.first_name, a.last_name)), ''),
        a.last_name
      ) AS name
    FROM alumni_group_members m
    JOIN alumni a ON a.id = m.alumni_id
    WHERE m.group_id = $1::uuid
    ORDER BY lower(a.last_name), lower(coalesce(a.first_name, ''))
    `,
    [groupId],
  );
}

export async function getAlumniIdsForGroups(groupIds: string[]): Promise<string[]> {
  const ids = normalizeIds(groupIds);
  if (!ids.length) return [];
  await ensureAlumniGroupsTables();
  const rows = await query<Array<{ alumni_id: string }>>(
    `
    SELECT DISTINCT alumni_id
    FROM alumni_group_members
    WHERE group_id = ANY($1::uuid[])
    `,
    [ids],
  );
  return rows.map((row) => row.alumni_id);
}

export async function addAlumniGroupMembers(groupId: string, alumniIds: string[]) {
  await ensureAlumniGroupsTables();
  const ids = normalizeIds(alumniIds);
  if (!ids.length) return { added: 0, memberCount: (await getAlumniGroup(groupId))?.memberCount ?? 0 };

  const group = await getAlumniGroup(groupId);
  if (!group) throw new Error("Group not found.");

  // Only insert ids that exist on alumni (ignore stale picks).
  const valid = await query<Array<{ id: string }>>(
    `SELECT id FROM alumni WHERE id = ANY($1::uuid[])`,
    [ids],
  );
  const validIds = valid.map((row) => row.id);
  if (!validIds.length) {
    return { added: 0, memberCount: group.memberCount };
  }

  const inserted = await query<Array<{ alumni_id: string }>>(
    `
    INSERT INTO alumni_group_members (group_id, alumni_id)
    SELECT $1::uuid, x.id
    FROM unnest($2::uuid[]) AS x(id)
    ON CONFLICT (group_id, alumni_id) DO NOTHING
    RETURNING alumni_id
    `,
    [groupId, validIds],
  );

  await query(`UPDATE alumni_groups SET updated_at = now() WHERE id = $1::uuid`, [groupId]);
  const next = await getAlumniGroup(groupId);
  return { added: inserted.length, memberCount: next?.memberCount ?? group.memberCount };
}

export async function removeAlumniGroupMembers(groupId: string, alumniIds: string[]) {
  await ensureAlumniGroupsTables();
  const ids = normalizeIds(alumniIds);
  if (!ids.length) return { removed: 0, memberCount: (await getAlumniGroup(groupId))?.memberCount ?? 0 };

  const group = await getAlumniGroup(groupId);
  if (!group) throw new Error("Group not found.");

  const removed = await query<Array<{ alumni_id: string }>>(
    `
    DELETE FROM alumni_group_members
    WHERE group_id = $1::uuid AND alumni_id = ANY($2::uuid[])
    RETURNING alumni_id
    `,
    [groupId, ids],
  );
  await query(`UPDATE alumni_groups SET updated_at = now() WHERE id = $1::uuid`, [groupId]);
  const next = await getAlumniGroup(groupId);
  return { removed: removed.length, memberCount: next?.memberCount ?? 0 };
}
