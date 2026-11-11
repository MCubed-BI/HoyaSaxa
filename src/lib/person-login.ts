/**
 * Admin-issued portal logins for People roles Alum and Support.
 * Credentials live on alumni_accounts (net_id + password_hash) linked via alumni_claims.
 */
import { hashAlumniPassword, isValidEmail } from "@/lib/alumni-auth";
import {
  ensureAlumniAuthTables,
  getAccountByEmail,
  getAccountByNetId,
} from "@/lib/alumni-claim";
import { isNetIdUniqueConflict, normalizeNetId, normalizeSupporterUsername } from "@/lib/alumni-net-id";
import { getSql } from "@/lib/db";
import { normalizePersonKind, type PersonKind } from "@/lib/person-kind";

export type PersonLoginInfo = {
  alumniId: string;
  personKind: PersonKind;
  username: string | null;
  email: string | null;
  hasLogin: boolean;
};

export type PersonLoginKind = "alum" | "supporter";

function syntheticLoginEmail(kind: PersonLoginKind, username: string) {
  return kind === "alum" ? `alum.${username}@hoyasaxa.local` : `supporter.${username}@hoyasaxa.local`;
}

function assertPassword(password: string) {
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  if (password.length > 200) throw new Error("Password is too long.");
  return password;
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

export async function setPersonLoginCredentials(input: {
  alumniId: string;
  kind: PersonLoginKind;
  /** Support username or Alum NetID (stored on alumni_accounts.net_id). */
  username: string;
  password: string;
  email?: string | null;
}): Promise<PersonLoginInfo> {
  await ensureAlumniAuthTables();
  const sql = getSql();
  const alumniId = input.alumniId.trim();
  if (!alumniId) throw new Error("Missing person id.");

  const username =
    input.kind === "alum" ? normalizeNetId(input.username) : normalizeSupporterUsername(input.username);
  const password = assertPassword(input.password);

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
  const personKind = normalizePersonKind(person.person_kind);
  if (personKind !== input.kind) {
    throw new Error(
      input.kind === "alum"
        ? "NetID login can only be created for Players (Alum)."
        : "Username login can only be created for Supporters.",
    );
  }

  const emailRaw =
    input.email?.trim() || person.email_primary?.trim() || syntheticLoginEmail(input.kind, username);
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
  const passwordHash = hashAlumniPassword(password);

  if (byUsername && claimedAccountId && byUsername.id !== claimedAccountId) {
    throw new Error(
      input.kind === "alum"
        ? "That NetID is already used by another login."
        : "That username is already used by another login.",
    );
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
      throw new Error(
        input.kind === "alum"
          ? "That NetID is already used by another login."
          : "That username is already used by another login.",
      );
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
      throw new Error(
        input.kind === "alum"
          ? "That NetID is already used by another login."
          : "That username is already used by another login.",
      );
    }
    throw error;
  }

  const info = await getPersonLoginInfo(alumniId);
  if (!info) throw new Error("Could not save login.");
  return info;
}

export async function attachPersonLogins<T extends { id: string }>(
  rows: T[],
): Promise<Array<T & { login_username: string | null; has_login: boolean }>> {
  if (rows.length === 0) return [];
  await ensureAlumniAuthTables();
  const sql = getSql();
  const ids = rows.map((row) => row.id);
  try {
    const logins = (await sql.query(
      `
      SELECT
        c.alumni_id::text AS alumni_id,
        acc.net_id AS username
      FROM alumni_claims c
      JOIN alumni_accounts acc ON acc.id = c.account_id
      WHERE c.alumni_id = ANY($1::uuid[])
      `,
      [ids],
    )) as Array<{ alumni_id: string; username: string | null }>;
    const byId = new Map(
      logins.map((row) => [
        row.alumni_id,
        row.username?.trim() ? row.username.trim().toLowerCase() : null,
      ]),
    );
    return rows.map((row) => {
      const username = byId.get(row.id) ?? null;
      return { ...row, login_username: username, has_login: byId.has(row.id) };
    });
  } catch {
    return rows.map((row) => ({ ...row, login_username: null, has_login: false }));
  }
}
