/**
 * Development People role: roster row + staff_roles admin with username/password.
 * Signs in at Admin login (`ga_session`) with full admin access.
 */
import { hashAlumniPassword, verifyAlumniPassword } from "@/lib/alumni-auth";
import { getCoachCredentials } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { ensurePortalTables } from "@/lib/portal-schema";
import {
  assertDevelopmentPassword,
  normalizeDevelopmentUsername,
} from "@/lib/person-kind";
import { isAssignedAdmin } from "@/lib/platform-roles";
import { allStaffUsernames } from "@/lib/roles";
import {
  isStaffRolesUniqueViolation,
  staffRoleIdentity,
  type StaffRoleRow,
} from "@/lib/staff-roles";

export type DevelopmentStaffGrant = {
  alumniId: string;
  username: string;
  password: string;
  email?: string | null;
  name?: string | null;
};

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

export async function findStaffRoleByUsername(username: string): Promise<StaffRoleRow | null> {
  const trimmed = username.trim();
  if (!trimmed) return null;
  await ensurePortalTables();
  const rows = await query<StaffRoleRow[]>(
    `
    SELECT id, username, email, alumni_id, role
    FROM staff_roles
    WHERE username IS NOT NULL AND btrim(username) <> '' AND lower(username) = lower($1)
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [trimmed],
  );
  return rows[0] ?? null;
}

type StaffAuthRow = StaffRoleRow & { password_hash: string | null };

async function findStaffAuthByUsername(username: string): Promise<StaffAuthRow | null> {
  const trimmed = username.trim();
  if (!trimmed) return null;
  await ensurePortalTables();
  const rows = await query<StaffAuthRow[]>(
    `
    SELECT id, username, email, alumni_id, role, password_hash
    FROM staff_roles
    WHERE username IS NOT NULL AND btrim(username) <> '' AND lower(username) = lower($1)
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [trimmed],
  );
  return rows[0] ?? null;
}

/**
 * Verify Development (or other DB-backed) staff username/password.
 * Only admin/owner rows with a password_hash may authenticate this way.
 */
export async function verifyDevelopmentStaffCredentials(username: string, password: string) {
  const row = await findStaffAuthByUsername(username);
  if (!row?.username || !row.password_hash) return null;
  if (!isAssignedAdmin(row.role)) return null;
  if (!verifyAlumniPassword(password, row.password_hash)) return null;
  return {
    username: row.username,
    email: row.email,
    alumniId: row.alumni_id,
    role: row.role,
  };
}

/** Grant full admin on staff_roles for a Development person (creates or updates). */
export async function grantDevelopmentAdmin(input: DevelopmentStaffGrant) {
  const username = normalizeDevelopmentUsername(input.username);
  const password = assertDevelopmentPassword(input.password);
  const alumniId = input.alumniId.trim();
  if (!alumniId) throw new Error("Alumni id is required for Development.");
  const reserved = allStaffUsernames(getCoachCredentials().username).map((name) => name.toLowerCase());
  if (reserved.includes(username.toLowerCase())) {
    throw new Error("That username is reserved for an existing staff login. Choose another.");
  }

  await ensurePortalTables();
  const passwordHash = hashAlumniPassword(password);
  const identity = staffRoleIdentity({
    alumniId,
    email: input.email,
    username,
    name: input.name,
  });

  const byUsername = await findStaffRoleByUsername(username);
  if (byUsername && byUsername.alumni_id && byUsername.alumni_id !== alumniId) {
    throw new Error("That username is already assigned to another person.");
  }

  const existing = byUsername
    ? byUsername
    : (
        await query<StaffRoleRow[]>(
          `
          SELECT id, username, email, alumni_id, role
          FROM staff_roles
          WHERE ($1 <> '' AND alumni_id::text = $1)
             OR ($2 <> '' AND lower(email) = lower($2))
          ORDER BY
            CASE
              WHEN $1 <> '' AND alumni_id::text = $1 THEN 0
              ELSE 1
            END,
            created_at DESC
          LIMIT 1
          `,
          [identity.alumniId, identity.email],
        )
      )[0] ?? null;

  if (existing) {
    try {
      const rows = await query<StaffRoleRow[]>(
        `
        UPDATE staff_roles
        SET role = 'admin',
            username = $2,
            email = COALESCE(NULLIF($3, ''), staff_roles.email),
            alumni_id = COALESCE($4::uuid, staff_roles.alumni_id),
            password_hash = $5
        WHERE id = $1
        RETURNING id, username, email, alumni_id, role
        `,
        [existing.id, username, identity.email, alumniId, passwordHash],
      );
      return rows[0] ?? existing;
    } catch (error) {
      if (isStaffRolesUniqueViolation(error)) {
        throw new Error("That username or email is already in use.");
      }
      throw error;
    }
  }

  try {
    const rows = await query<StaffRoleRow[]>(
      `
      INSERT INTO staff_roles (username, email, alumni_id, role, password_hash)
      VALUES ($1, NULLIF($2, ''), $3::uuid, 'admin', $4)
      RETURNING id, username, email, alumni_id, role
      `,
      [username, identity.email, alumniId, passwordHash],
    );
    return rows[0]!;
  } catch (error) {
    if (isStaffRolesUniqueViolation(error)) {
      throw new Error("That username or email is already in use.");
    }
    throw error;
  }
}
