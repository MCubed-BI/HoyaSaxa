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

export type StaffRoleIdentity = {
  alumniId: string;
  email: string;
  username: string;
};

/** Match `staff_roles` on any unique key: alumni_id, lower(email), lower(username). */
export function staffRoleIdentity(input: {
  alumniId?: string | null;
  email?: string | null;
  username?: string | null;
  name?: string | null;
}): StaffRoleIdentity {
  return {
    alumniId: input.alumniId?.trim() ?? "",
    email: input.email?.trim() ?? "",
    username: (input.username ?? input.name ?? "").trim(),
  };
}

export function isStaffRolesUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  if (code === "23505") return true;
  const message =
    error instanceof Error
      ? error.message
      : "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";
  return /staff_roles_(username_lower|email_lower|alumni_id)|duplicate key value violates unique constraint/i.test(
    message,
  );
}

export function isOnConflictTargetMissing(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /no unique or exclusion constraint matching the ON CONFLICT specification/i.test(message);
}

/**
 * Username unique index is `staff_roles_username_lower` on `lower(username)`.
 * Infer that expression + the same partial predicate so a second Grant Board
 * updates role / alumni_id instead of INSERT-conflicting.
 */
export const UPSERT_BOARD_STAFF_ROLE_SQL = `
INSERT INTO staff_roles (username, email, alumni_id, role)
VALUES (NULLIF($1, ''), NULLIF($2, ''), $3::uuid, 'board')
ON CONFLICT ((lower(username))) WHERE username IS NOT NULL AND btrim(username) <> ''
DO UPDATE SET
  role = CASE
    WHEN staff_roles.role IN ('owner', 'admin') THEN staff_roles.role
    ELSE 'board'
  END,
  alumni_id = COALESCE(EXCLUDED.alumni_id, staff_roles.alumni_id),
  email = COALESCE(EXCLUDED.email, staff_roles.email)
RETURNING id, username, email, alumni_id, role
`;

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

async function findStaffRole(identity: StaffRoleIdentity) {
  if (!identity.alumniId && !identity.email && !identity.username) return null;
  const rows = await query<StaffRoleRow[]>(
    `
    SELECT id, username, email, alumni_id, role
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
    [identity.alumniId, identity.email, identity.username],
  );
  return rows[0] ?? null;
}

async function updateBoardByIdentity(identity: StaffRoleIdentity) {
  const rows = await query<StaffRoleRow[]>(
    `
    UPDATE staff_roles
    SET role = CASE
          WHEN staff_roles.role IN ('owner', 'admin') THEN staff_roles.role
          ELSE 'board'
        END,
        alumni_id = COALESCE(NULLIF($1, '')::uuid, staff_roles.alumni_id),
        email = COALESCE(staff_roles.email, NULLIF($2, '')),
        username = COALESCE(staff_roles.username, NULLIF($3, ''))
    WHERE ($1 <> '' AND alumni_id::text = $1)
       OR ($2 <> '' AND lower(email) = lower($2))
       OR ($3 <> '' AND lower(username) = lower($3))
    RETURNING id, username, email, alumni_id, role
    `,
    [identity.alumniId, identity.email, identity.username],
  );
  return rows[0] ?? null;
}

async function revokeBoardByIdentity(identity: StaffRoleIdentity, currentId?: string | null) {
  await query(
    `
    DELETE FROM staff_roles
    WHERE role = 'board'
      AND (
        ($1 <> '' AND alumni_id::text = $1)
        OR ($2 <> '' AND lower(email) = lower($2))
        OR ($3 <> '' AND lower(username) = lower($3))
        OR ($4 <> '' AND id::text = $4)
      )
    `,
    [identity.alumniId, identity.email, identity.username, currentId?.trim() ?? ""],
  );
}

async function recoverBoardRow(identity: StaffRoleIdentity, error: unknown): Promise<StaffRoleRow> {
  const recovered = await updateBoardByIdentity(identity);
  if (!recovered) throw error;
  return recovered;
}

async function insertBoardRow(identity: StaffRoleIdentity) {
  const rows = await query<StaffRoleRow[]>(
    `
    INSERT INTO staff_roles (username, email, alumni_id, role)
    VALUES (NULLIF($1, ''), NULLIF($2, ''), $3::uuid, 'board')
    RETURNING id, username, email, alumni_id, role
    `,
    [identity.username, identity.email, identity.alumniId],
  );
  return rows[0] ?? null;
}

async function upsertBoardRow(identity: StaffRoleIdentity, current: StaffRoleRow | null) {
  if (current) {
    try {
      const rows = await query<StaffRoleRow[]>(
        `
        UPDATE staff_roles
        SET role = 'board',
            alumni_id = COALESCE($2::uuid, staff_roles.alumni_id),
            username = COALESCE(staff_roles.username, NULLIF($3, '')),
            email = COALESCE(staff_roles.email, NULLIF($4, ''))
        WHERE id = $1
          AND role NOT IN ('owner', 'admin')
        RETURNING id, username, email, alumni_id, role
        `,
        [current.id, identity.alumniId, identity.username, identity.email],
      );
      return rows[0] ?? current;
    } catch (error) {
      if (!isStaffRolesUniqueViolation(error)) throw error;
      return recoverBoardRow(identity, error);
    }
  }

  try {
    const rows = await query<StaffRoleRow[]>(UPSERT_BOARD_STAFF_ROLE_SQL, [
      identity.username,
      identity.email,
      identity.alumniId,
    ]);
    return rows[0] ?? null;
  } catch (error) {
    if (isOnConflictTargetMissing(error)) {
      try {
        return (await updateBoardByIdentity(identity)) ?? (await insertBoardRow(identity));
      } catch (fallbackError) {
        if (!isStaffRolesUniqueViolation(fallbackError)) throw fallbackError;
        return recoverBoardRow(identity, fallbackError);
      }
    }
    if (!isStaffRolesUniqueViolation(error)) throw error;
    return recoverBoardRow(identity, error);
  }
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
  const requested = staffRoleIdentity({ alumniId, email: input.email, name: input.name });
  const current = await findStaffRole(requested);
  const identity = staffRoleIdentity({
    alumniId,
    email: requested.email || current?.email,
    username: requested.username || current?.username,
  });
  const decision = boardGrantDecision(current?.role, input.grant);
  if (decision.action === "keep-admin") {
    if (current && !current.alumni_id && identity.alumniId) {
      await query(`UPDATE staff_roles SET alumni_id = COALESCE(alumni_id, $2::uuid) WHERE id = $1`, [
        current.id,
        identity.alumniId,
      ]);
    }
    return { ok: true as const, board: false, keptAdmin: true as const, role: current?.role ?? "admin" };
  }
  if (decision.action === "delete-board") {
    await revokeBoardByIdentity(identity, current?.id);
    return { ok: true as const, board: false, keptAdmin: false as const, role: null };
  }

  const row = await upsertBoardRow(identity, current);
  if (row && isAssignedAdmin(row.role)) {
    return { ok: true as const, board: false, keptAdmin: true as const, role: row.role };
  }
  return { ok: true as const, board: true, keptAdmin: false as const, role: "board" as const };
}
