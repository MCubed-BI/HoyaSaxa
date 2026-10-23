import { ensureAlumniAuthTables } from "@/lib/alumni-claim";
import { getSql } from "@/lib/db";
import { ensurePersonColumns } from "@/lib/people-schema";
import { normalizePersonKind, type PersonKind } from "@/lib/person-kind";
import { normalizeState } from "@/lib/us-centroids";

function withLoginDefaults<T extends { login_username?: string | null; has_login?: boolean }>(
  row: T,
): T & { login_username: string | null; has_login: boolean } {
  return {
    ...row,
    login_username: row.login_username?.trim() ? row.login_username.trim().toLowerCase() : null,
    has_login: Boolean(row.has_login),
  };
}

export type AdminPersonRow = {
  id: string;
  first_name: string | null;
  last_name: string;
  preferred_name: string | null;
  full_name: string | null;
  person_kind: PersonKind;
  admin_verified: boolean;
  admin_verified_at: string | null;
  admin_verified_by: string | null;
  email_primary: string | null;
  phone_primary: string | null;
  current_city: string | null;
  current_state: string | null;
  hometown_city: string | null;
  hometown_state: string | null;
  class_year: string | null;
  position: string | null;
  created_at: string;
  updated_at: string;
  /** Login username (net_id) when an account is linked. */
  login_username: string | null;
  has_login: boolean;
};

export type CreatePersonInput = {
  firstName?: string;
  lastName: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  currentCity?: string;
  currentState?: string;
  hometownCity?: string;
  hometownState?: string;
  classYear?: string;
  position?: string;
  personKind: PersonKind;
  /** When true (default), mark verified immediately. */
  verified?: boolean;
  verifiedBy?: string;
};

function trimOrNull(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function fullNameFrom(first: string | null, last: string) {
  return [first, last].filter(Boolean).join(" ").trim() || last;
}

export async function createPerson(input: CreatePersonInput): Promise<AdminPersonRow> {
  await ensurePersonColumns();
  const sql = getSql();
  const lastName = input.lastName.trim();
  if (!lastName) throw new Error("Last name is required.");
  const firstName = trimOrNull(input.firstName);
  const preferredName = trimOrNull(input.preferredName);
  const personKind = normalizePersonKind(input.personKind);
  const verified = input.verified !== false;
  const verifiedBy = verified ? trimOrNull(input.verifiedBy) ?? "Admin" : null;
  const currentState = normalizeState(input.currentState) ?? trimOrNull(input.currentState);
  const hometownState = normalizeState(input.hometownState) ?? trimOrNull(input.hometownState);
  const fullName = fullNameFrom(preferredName || firstName, lastName);

  const rows = await sql.query(
    `
    INSERT INTO alumni (
      first_name, last_name, preferred_name, full_name,
      email_primary, phone_primary,
      current_city, current_state, hometown_city, hometown_state,
      class_year, position,
      person_kind, admin_verified, admin_verified_at, admin_verified_by,
      source_flags
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6,
      $7, $8, $9, $10,
      $11, $12,
      $13, $14, CASE WHEN $14 THEN now() ELSE NULL END, $15,
      $16::jsonb
    )
    RETURNING
      id, first_name, last_name, preferred_name, full_name,
      person_kind, admin_verified, admin_verified_at::text, admin_verified_by,
      email_primary, phone_primary,
      current_city, current_state, hometown_city, hometown_state,
      class_year, position,
      created_at::text, updated_at::text
    `,
    [
      firstName,
      lastName,
      preferredName,
      fullName,
      trimOrNull(input.email),
      trimOrNull(input.phone),
      trimOrNull(input.currentCity),
      currentState,
      trimOrNull(input.hometownCity),
      hometownState,
      trimOrNull(input.classYear),
      trimOrNull(input.position),
      personKind,
      verified,
      verifiedBy,
      JSON.stringify({ admin_created: true, person_kind: personKind }),
    ],
  );
  return withLoginDefaults(rows[0] as AdminPersonRow);
}

export async function listPeopleForAdmin(options?: {
  unverifiedOnly?: boolean;
  limit?: number;
}): Promise<AdminPersonRow[]> {
  await ensurePersonColumns();
  await ensureAlumniAuthTables();
  const sql = getSql();
  const limit = Math.max(1, Math.min(options?.limit ?? 100, 300));
  const where = options?.unverifiedOnly ? "WHERE a.admin_verified = false" : "";
  const rows = await sql.query(
    `
    SELECT
      a.id, a.first_name, a.last_name, a.preferred_name, a.full_name,
      a.person_kind, a.admin_verified, a.admin_verified_at::text, a.admin_verified_by,
      a.email_primary, a.phone_primary,
      a.current_city, a.current_state, a.hometown_city, a.hometown_state,
      a.class_year, a.position,
      a.created_at::text, a.updated_at::text,
      acc.net_id AS login_username,
      (acc.id IS NOT NULL) AS has_login
    FROM alumni a
    LEFT JOIN alumni_claims c ON c.alumni_id = a.id
    LEFT JOIN alumni_accounts acc ON acc.id = c.account_id
    ${where}
    ORDER BY
      a.admin_verified ASC,
      a.updated_at DESC,
      lower(a.last_name),
      lower(coalesce(a.first_name, ''))
    LIMIT ${limit}
    `,
  );
  return (rows as AdminPersonRow[]).map((row) => withLoginDefaults(row));
}

export async function setPersonVerified(
  id: string,
  verified: boolean,
  verifiedBy?: string,
): Promise<AdminPersonRow | null> {
  await ensurePersonColumns();
  const sql = getSql();
  const rows = await sql.query(
    `
    UPDATE alumni
    SET
      admin_verified = $2,
      admin_verified_at = CASE WHEN $2 THEN now() ELSE NULL END,
      admin_verified_by = CASE WHEN $2 THEN $3 ELSE NULL END,
      updated_at = now()
    WHERE id = $1::uuid
    RETURNING
      id, first_name, last_name, preferred_name, full_name,
      person_kind, admin_verified, admin_verified_at::text, admin_verified_by,
      email_primary, phone_primary,
      current_city, current_state, hometown_city, hometown_state,
      class_year, position,
      created_at::text, updated_at::text
    `,
    [id, verified, verified ? trimOrNull(verifiedBy) ?? "Admin" : null],
  );
  const row = rows[0] as AdminPersonRow | undefined;
  return row ? withLoginDefaults(row) : null;
}

export async function setPersonKind(id: string, kind: PersonKind): Promise<AdminPersonRow | null> {
  await ensurePersonColumns();
  const sql = getSql();
  const personKind = normalizePersonKind(kind);
  const rows = await sql.query(
    `
    UPDATE alumni
    SET person_kind = $2, updated_at = now()
    WHERE id = $1::uuid
    RETURNING
      id, first_name, last_name, preferred_name, full_name,
      person_kind, admin_verified, admin_verified_at::text, admin_verified_by,
      email_primary, phone_primary,
      current_city, current_state, hometown_city, hometown_state,
      class_year, position,
      created_at::text, updated_at::text
    `,
    [id, personKind],
  );
  const row = rows[0] as AdminPersonRow | undefined;
  return row ? withLoginDefaults(row) : null;
}

export async function countUnverifiedPeople() {
  await ensurePersonColumns();
  const sql = getSql();
  const rows = (await sql.query(
    `SELECT COUNT(*)::int AS total FROM alumni WHERE admin_verified = false`,
  )) as Array<{ total: number }>;
  return rows[0]?.total ?? 0;
}
