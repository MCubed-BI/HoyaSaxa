import { hashAlumniPassword, isValidEmail } from "@/lib/alumni-auth";
import {
  ensureAlumniAuthTables,
  getAccountByEmail,
  getAccountByNetId,
} from "@/lib/alumni-claim";
import { isNetIdUniqueConflict, normalizeSupporterUsername } from "@/lib/alumni-net-id";
import { getSql } from "@/lib/db";
import { normalizePersonKind, type PersonKind } from "@/lib/person-kind";

export type PersonLoginInfo = {
  alumniId: string;
  personKind: PersonKind;
  username: string | null;
  email: string | null;
  hasLogin: boolean;
};

export { normalizeSupporterUsername };

function syntheticSupporterEmail(username: string) {
  return `supporter.${username}@hoyasaxa.local`;
}

export async function getPersonLoginInfo(alumniId: string): Promise<PersonLoginInfo | null> {
  await ensureAlumniAuthTables();
  const sql = getSql();
  const rows = (await sql.query(
    `
    SELECT
      a.id,
      coalesce(a.person_kind, 'alum') AS person_kind,
      a.email_primary,
      acc.id AS account_id,
      acc.email AS account_email,
      acc.net_id AS username
    FROM alumni a
    LEFT JOIN alumni_claims c ON c.alumni_id = a.id
    LEFT JOIN alumni_accounts acc ON acc.id = c.account_id
    WHERE a.id = $1::uuid
    LIMIT 1
    `,
    [alumniId],
  )) as Array<{
    id: string;
    person_kind: string;
    email_primary: string | null;
    account_id: string | null;
    account_email: string | null;
    username: string | null;
  }>;
  const row = rows[0];
  if (!row) return null;
  return {
    alumniId: row.id,
    personKind: normalizePersonKind(row.person_kind),
    username: row.username?.trim() ? row.username.trim().toLowerCase() : null,
    email: row.account_email?.trim() || row.email_primary?.trim() || null,
    hasLogin: Boolean(row.account_id),
  };
}

export async function setSupporterLoginCredentials(input: {
  alumniId: string;
  username: string;
  password: string;
  email?: string | null;
}): Promise<PersonLoginInfo> {
  await ensureAlumniAuthTables();
  const sql = getSql();
  const alumniId = input.alumniId.trim();
  if (!alumniId) throw new Error("Missing person id.");

  const username = normalizeSupporterUsername(input.username);
  if (input.password.length < 8) throw new Error("Password must be at least 8 characters.");

  const people = (await sql.query(
    `
    SELECT
      id,
      coalesce(person_kind, 'alum') AS person_kind,
      email_primary
    FROM alumni
    WHERE id = $1::uuid
    LIMIT 1
    `,
    [alumniId],
  )) as Array<{ id: string; person_kind: string; email_primary: string | null }>;
  const person = people[0];
  if (!person) throw new Error("Person not found.");
  if (normalizePersonKind(person.person_kind) !== "supporter") {
    throw new Error("Login credentials can only be created for Supporters.");
  }

  const emailRaw = input.email?.trim() || person.email_primary?.trim() || syntheticSupporterEmail(username);
  const email = emailRaw.toLowerCase();
  if (!isValidEmail(email) && !email.endsWith("@hoyasaxa.local")) {
    throw new Error("Enter a valid email, or leave blank to use an auto-generated login email.");
  }

  const existingClaims = (await sql.query(
    `
    SELECT account_id::text AS account_id
    FROM alumni_claims
    WHERE alumni_id = $1::uuid
    LIMIT 1
    `,
    [alumniId],
  )) as Array<{ account_id: string }>;

  const byUsername = await getAccountByNetId(username);
  const byEmail = await getAccountByEmail(email);
  const claimedAccountId = existingClaims[0]?.account_id ?? null;
  const passwordHash = hashAlumniPassword(input.password);

  if (byUsername && claimedAccountId && byUsername.id !== claimedAccountId) {
    throw new Error("That username is already used by another login.");
  }
  if (byEmail && claimedAccountId && byEmail.id !== claimedAccountId) {
    throw new Error("That email already has a login.");
  }
  if (byUsername && !claimedAccountId) {
    const otherClaim = (await sql.query(
      `SELECT alumni_id::text AS alumni_id FROM alumni_claims WHERE account_id = $1::uuid LIMIT 1`,
      [byUsername.id],
    )) as Array<{ alumni_id: string }>;
    if (otherClaim[0] && otherClaim[0].alumni_id !== alumniId) {
      throw new Error("That username is already used by another login.");
    }
  }
  if (byEmail && !claimedAccountId) {
    const otherClaim = (await sql.query(
      `SELECT alumni_id::text AS alumni_id FROM alumni_claims WHERE account_id = $1::uuid LIMIT 1`,
      [byEmail.id],
    )) as Array<{ alumni_id: string }>;
    if (otherClaim[0] && otherClaim[0].alumni_id !== alumniId) {
      throw new Error("That email already has a login.");
    }
  }

  try {
    let accountId = claimedAccountId ?? byUsername?.id ?? byEmail?.id ?? null;
    if (accountId) {
      await sql.query(
        `
        UPDATE alumni_accounts
        SET email = $2, password_hash = $3, net_id = $4, updated_at = now()
        WHERE id = $1::uuid
        `,
        [accountId, email, passwordHash, username],
      );
    } else {
      const created = (await sql.query(
        `
        INSERT INTO alumni_accounts (email, password_hash, net_id)
        VALUES ($1, $2, $3)
        RETURNING id::text AS id
        `,
        [email, passwordHash, username],
      )) as Array<{ id: string }>;
      accountId = created[0]!.id;
    }

    await sql.query(
      `INSERT INTO alumni_claims (account_id, alumni_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`,
      [accountId, alumniId],
    );
  } catch (error) {
    if (isNetIdUniqueConflict(error)) {
      throw new Error("That username is already used by another login.");
    }
    throw error;
  }

  const info = await getPersonLoginInfo(alumniId);
  if (!info) throw new Error("Could not save supporter login.");
  return info;
}

export async function primaryPersonKindForAccount(accountId: string): Promise<PersonKind | null> {
  await ensureAlumniAuthTables();
  const sql = getSql();
  const rows = (await sql.query(
    `
    SELECT coalesce(a.person_kind, 'alum') AS person_kind
    FROM alumni_claims c
    JOIN alumni a ON a.id = c.alumni_id
    WHERE c.account_id = $1::uuid
    ORDER BY
      CASE WHEN coalesce(a.person_kind, 'alum') = 'supporter' THEN 0 ELSE 1 END,
      c.created_at DESC
    LIMIT 1
    `,
    [accountId],
  )) as Array<{ person_kind: string }>;
  if (!rows[0]) return null;
  return normalizePersonKind(rows[0].person_kind);
}

/** True when any claimed roster row matches the requested affiliation. */
export async function accountHasPersonKind(accountId: string, kind: PersonKind): Promise<boolean> {
  await ensureAlumniAuthTables();
  const sql = getSql();
  const rows = (await sql.query(
    `
    SELECT 1
    FROM alumni_claims c
    JOIN alumni a ON a.id = c.alumni_id
    WHERE c.account_id = $1::uuid
      AND coalesce(a.person_kind, 'alum') = $2
    LIMIT 1
    `,
    [accountId, kind],
  )) as Array<{ "?column?": number }>;
  return rows.length > 0;
}
