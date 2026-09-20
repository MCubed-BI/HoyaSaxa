/**
 * Persist Admin / Board grants on `staff_roles`.
 * Cookie contracts stay `ga_session` / `hoya_alum_session` — this is the DB overlay.
 */
import { getSql } from "@/lib/db";
import { ensurePortalTables } from "@/lib/portal-schema";
import { isAssignedAdmin, isAssignedBoard } from "@/lib/platform-roles";
import { normalizeStaffRole, type Role } from "@/lib/roles";

export type StaffRoleRow = {
  id: string;
  username: string | null;
  email: string | null;
  alumni_id: string | null;
  role: string;
};

export type AssignedStaffRole = Role | "admin";

export type BoardGrantDecision =
  | { action: "upsert-board" }
  | { action: "delete-board" }
  | { action: "keep-admin" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAlumniRecordId(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value.trim()));
}

/** Pure helper: never demote owner/admin via the Board toggle. */
export function boardGrantDecision(currentRole: string | null | undefined, grant: boolean): BoardGrantDecision {
  if (isAssignedAdmin(currentRole)) return { action: "keep-admin" };
  if (grant) return { action: "upsert-board" };
  if (isAssignedBoard(currentRole) || !currentRole) return { action: "delete-board" };
  return { action: "delete-board" };
}

export function normalizeAssignedRole(role: string | null | undefined): AssignedStaffRole | null {
  if (role === "admin") return "admin";
  return normalizeStaffRole(role);
}

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

export async function lookupAssignedRole(input: {
  username?: string | null;
  email?: string | null;
  alumniId?: string | null;
  name?: string | null;
}): Promise<AssignedStaffRole | null> {
  await ensurePortalTables();
  const alumniId = input.alumniId?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const username = (input.username ?? input.name ?? "").trim();
  if (!alumniId && !email && !username) return null;

  const rows = await query<Array<{ role: string }>>(
    `
    SELECT role
    FROM staff_roles
    WHERE ($1 <> '' AND alumni_id::text = $1)
       OR ($2 <> '' AND lower(email) = lower($2))
       OR ($3 <> '' AND lower(username) = lower($3))
    ORDER BY
      CASE
        WHEN $1 <> '' AND alumni_id::text = $1 THEN 0
        WHEN $2 <> '' AND lower(email) = lower($2) THEN 1
        ELSE 2
      END,
      created_at DESC
    LIMIT 1
    `,
    [alumniId, email, username],
  );
  return normalizeAssignedRole(rows[0]?.role);
}

export async function isBoardMember(alumniId: string) {
  if (!isAlumniRecordId(alumniId)) return false;
  const role = await lookupAssignedRole({ alumniId });
  return isAssignedBoard(role);
}

export async function listBoardMembers() {
  await ensurePortalTables();
  return query<StaffRoleRow[]>(
    `
    SELECT id, username, email, alumni_id, role
    FROM staff_roles
    WHERE role = 'board'
    ORDER BY lower(coalesce(username, email, alumni_id::text))
    `,
  );
}

export async function setBoardMember(input: {
  alumniId: string;
  grant: boolean;
  name?: string | null;
  email?: string | null;
}) {
  const alumniId = input.alumniId.trim();
  if (!isAlumniRecordId(alumniId)) {
    throw new Error("A roster alumni id is required.");
  }
  await ensurePortalTables();
  const existing = await query<StaffRoleRow[]>(
    `
    SELECT id, username, email, alumni_id, role
    FROM staff_roles
    WHERE alumni_id = $1::uuid
       OR ($2 <> '' AND lower(email) = lower($2))
    ORDER BY
      CASE WHEN alumni_id = $1::uuid THEN 0 ELSE 1 END,
      created_at DESC
    LIMIT 1
    `,
    [alumniId, input.email?.trim() ?? ""],
  );
  const current = existing[0] ?? null;
  const decision = boardGrantDecision(current?.role, input.grant);
  if (decision.action === "keep-admin") {
    return { ok: true as const, board: false, keptAdmin: true as const, role: current?.role ?? "admin" };
  }
  if (decision.action === "delete-board") {
    if (current && isAssignedBoard(current.role)) {
      await query(`DELETE FROM staff_roles WHERE id = $1`, [current.id]);
    }
    return { ok: true as const, board: false, keptAdmin: false as const, role: null };
  }

  const username = input.name?.trim() || current?.username || null;
  const email = input.email?.trim() || current?.email || null;
  if (current) {
    await query(
      `
      UPDATE staff_roles
      SET role = 'board',
          alumni_id = $2::uuid,
          username = coalesce($3, username),
          email = coalesce($4, email)
      WHERE id = $1
      `,
      [current.id, alumniId, username, email],
    );
  } else {
    await query(
      `
      INSERT INTO staff_roles (username, email, alumni_id, role)
      VALUES ($1, $2, $3::uuid, 'board')
      `,
      [username, email, alumniId],
    );
  }
  return { ok: true as const, board: true, keptAdmin: false as const, role: "board" as const };
}
