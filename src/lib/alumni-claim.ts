import { getSql } from "@/lib/db";
import {
  classYearTwoDigit,
  normalizeLastName,
  parseClassYearInput,
} from "@/lib/alumni-class-year";
import { hashAlumniPassword, isValidEmail, readAlumniSessionFromCookies, verifyAlumniPassword } from "@/lib/alumni-auth";
import { isNetIdUniqueConflict, normalizeNetId, parseAlumniLoginIdentifier } from "@/lib/alumni-net-id";
import {
  duplicateDismissalActorKey,
  ensureAlumniDuplicateDismissalTable,
  excludeDismissedById,
  listDismissedSourceIds,
  lookupAccountId,
  type DuplicateDismissalActor,
} from "@/lib/alumni-duplicate-dismissals";
import { isLikelyDuplicate } from "@/lib/alumni-duplicates";
import {
  OVERVIEW_COLUMN_FIELDS,
  overviewInputToAlumniPatch,
  type OverviewInput,
} from "@/lib/alumni-overview";
import { ensureAlumniPhotoColumns, updateAlumniPhotos, type AlumniPhotoPatch } from "@/lib/alumni-photos";
import { grantVerifiedHoyaForAlumSession } from "@/lib/badges";
import {
  ALUM_ROLE,
  ALUM_SESSION_COOKIE,
  isPreviewAlumSession,
  parseAlumSessionToken,
  type AlumRole,
  type CookieJar,
} from "@/lib/alum-session";
import { readHoyaAlumSession } from "@/lib/hoya-alum-session";
import type { AlumniDetail, AlumniListItem } from "@/lib/types";

export type ClaimMatch = AlumniListItem & {
  claimed: boolean;
  claimed_by_me: boolean;
};

export type AlumniAccount = {
  id: string;
  email: string;
  netId: string | null;
};

type AlumniAccountRow = {
  id: string;
  email: string;
  net_id?: string | null;
  password_hash?: string;
};

function toAlumniAccount(row: AlumniAccountRow): AlumniAccount {
  return {
    id: row.id,
    email: row.email,
    netId: row.net_id?.trim() ? row.net_id.trim().toLowerCase() : null,
  };
}

export type ClaimedRecord = AlumniDetail & {
  claimed_at: string;
};

const LIST_COLUMNS = `
  a.id,
  a.first_name,
  a.last_name,
  a.preferred_name,
  a.full_name,
  a.position,
  a.seasons,
  a.class_year,
  a.hometown_city,
  a.hometown_state,
  a.current_city,
  a.current_state,
  a.company_name,
  a.job_title,
  a.industry,
  a.linkedin_url,
  a.headline,
  a.email_primary,
  a.phone_primary,
  a.address_primary,
  a.football_photo_url,
  a.linkedin_photo_url
`;

let ensured = false;

export async function ensureAlumniAuthTables() {
  if (ensured) return;
  const sql = getSql();
  await ensureAlumniPhotoColumns();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS alumni_accounts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL,
      password_hash text NOT NULL,
      net_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`ALTER TABLE alumni_accounts ADD COLUMN IF NOT EXISTS net_id text`);
  await sql.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS alumni_accounts_email_lower
    ON alumni_accounts (lower(email))
  `);
  await sql.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS alumni_accounts_net_id_lower
    ON alumni_accounts (lower(net_id))
    WHERE net_id IS NOT NULL AND btrim(net_id) <> ''
  `);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS alumni_claims (
      account_id uuid NOT NULL REFERENCES alumni_accounts(id) ON DELETE CASCADE,
      alumni_id uuid NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (account_id, alumni_id)
    )
  `);
  await sql.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS alumni_claims_alumni_unique
    ON alumni_claims (alumni_id)
  `);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS alumni_record_merges (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id uuid REFERENCES alumni_accounts(id) ON DELETE CASCADE,
      keeper_alumni_id uuid NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
      merged_alumni_id uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(`ALTER TABLE alumni_record_merges ALTER COLUMN account_id DROP NOT NULL`);
  await ensureAlumniDuplicateDismissalTable();
  ensured = true;
}

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

export function publicMatch(row: ClaimMatch): ClaimMatch {
  return {
    ...row,
    email_primary: row.email_primary ? maskEmail(row.email_primary) : null,
    phone_primary: row.phone_primary ? maskPhone(row.phone_primary) : null,
    address_primary: null,
  };
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "on file";
  const visible = user.slice(0, 1);
  return `${visible}•••@${domain}`;
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "on file";
  return `•••-•••-${digits.slice(-4)}`;
}

export async function lookupRosterMatches(lastNameRaw: string, classYearRaw: string, accountId?: string | null) {
  await ensureAlumniAuthTables();
  const lastName = normalizeLastName(lastNameRaw);
  const year4 = parseClassYearInput(classYearRaw);
  if (!lastName || lastName.length < 2) {
    throw new Error("Enter the last name as it appears on the roster.");
  }
  if (!year4) {
    throw new Error("Enter a graduating class like ’15 or 2015.");
  }
  const year2 = classYearTwoDigit(year4)!;
  const rows = await query<ClaimMatch[]>(
    `
    SELECT ${LIST_COLUMNS},
      EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id) AS claimed,
      EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id AND c.account_id = $4) AS claimed_by_me
    FROM alumni a
    WHERE lower(btrim(a.last_name)) = lower(btrim($1))
      AND (
        btrim(a.class_year) = $2
        OR right(regexp_replace(coalesce(a.class_year, ''), '[^0-9]', '', 'g'), 4) = $2
        OR right(regexp_replace(coalesce(a.class_year, ''), '[^0-9]', '', 'g'), 2) = $3
      )
    ORDER BY lower(coalesce(a.first_name, '')), a.id
    LIMIT 25
    `,
    [lastName, year4, year2, accountId ?? "00000000-0000-0000-0000-000000000000"],
  );
  return { lastName, classYear: year4, matches: rows };
}

export async function findSameLastNameCandidates(lastName: string, accountId: string, excludeIds: string[]) {
  await ensureAlumniAuthTables();
  const exclude = excludeIds.length > 0 ? excludeIds : ["00000000-0000-0000-0000-000000000000"];
  const rows = await query<ClaimMatch[]>(
    `
    SELECT ${LIST_COLUMNS},
      EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id) AS claimed,
      EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id AND c.account_id = $2) AS claimed_by_me
    FROM alumni a
    WHERE lower(btrim(a.last_name)) = lower(btrim($1))
      AND a.id <> ALL($3::uuid[])
      AND (
        NOT EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id)
        OR EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id AND c.account_id = $2)
      )
    ORDER BY a.class_year DESC NULLS LAST, lower(coalesce(a.first_name, ''))
    LIMIT 25
    `,
    [lastName, accountId, exclude],
  );
  const actorKey = duplicateDismissalActorKey({ accountId });
  if (!actorKey) return rows;
  return excludeDismissedById(rows, await listDismissedSourceIds(actorKey, excludeIds));
}

export async function findLikelyDuplicateCandidates(
  person: Pick<AlumniListItem, "id" | "first_name" | "last_name" | "preferred_name" | "full_name">,
  actor?: string | null | DuplicateDismissalActor,
) {
  await ensureAlumniAuthTables();
  const lastName = person.last_name?.trim();
  if (!lastName) return [];
  const accountId = lookupAccountId(actor);
  const rows = await query<ClaimMatch[]>(
    `
    SELECT ${LIST_COLUMNS},
      EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id) AS claimed,
      EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id AND c.account_id = $2) AS claimed_by_me
    FROM alumni a
    WHERE lower(btrim(a.last_name)) = lower(btrim($1))
      AND a.id <> $3
    ORDER BY a.class_year DESC NULLS LAST, lower(coalesce(a.first_name, ''))
    LIMIT 40
    `,
    [lastName, accountId ?? "00000000-0000-0000-0000-000000000000", person.id],
  );
  const likely = rows.filter((row) => isLikelyDuplicate(person, row));
  const actorKey = typeof actor === "string" || !actor ? duplicateDismissalActorKey({ accountId }) : duplicateDismissalActorKey(actor);
  if (!actorKey) return likely;
  return excludeDismissedById(likely, await listDismissedSourceIds(actorKey, [person.id]));
}

export async function getAccountByEmail(email: string) {
  await ensureAlumniAuthTables();
  const rows = await query<Array<AlumniAccountRow & { password_hash: string }>>(
    `SELECT id, email, net_id, password_hash FROM alumni_accounts WHERE lower(email) = lower($1) LIMIT 1`,
    [email.trim()],
  );
  return rows[0] ?? null;
}

export async function getAccountByNetId(netId: string) {
  await ensureAlumniAuthTables();
  const normalized = netId.trim().toLowerCase();
  if (!normalized) return null;
  const rows = await query<Array<AlumniAccountRow & { password_hash: string }>>(
    `
    SELECT id, email, net_id, password_hash
    FROM alumni_accounts
    WHERE net_id IS NOT NULL AND btrim(net_id) <> '' AND lower(net_id) = $1
    LIMIT 1
    `,
    [normalized],
  );
  return rows[0] ?? null;
}

export async function getAccountByIdentifier(identifier: string) {
  const parsed = parseAlumniLoginIdentifier(identifier);
  if (parsed.kind === "email") return getAccountByEmail(parsed.value);
  if (parsed.kind === "netId") return getAccountByNetId(parsed.value);
  return null;
}

export async function getAccountById(id: string) {
  await ensureAlumniAuthTables();
  const rows = await query<AlumniAccountRow[]>(
    `SELECT id, email, net_id FROM alumni_accounts WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? toAlumniAccount(rows[0]) : null;
}

export async function getAccountByAlumniId(alumniId: string) {
  await ensureAlumniAuthTables();
  const rows = await query<AlumniAccountRow[]>(
    `
    SELECT a.id, a.email, a.net_id
    FROM alumni_accounts a
    JOIN alumni_claims c ON c.account_id = a.id
    WHERE c.alumni_id = $1
    ORDER BY c.created_at DESC
    LIMIT 1
    `,
    [alumniId],
  );
  return rows[0] ? toAlumniAccount(rows[0]) : null;
}

export async function updateAccountNetId(accountId: string, raw: string) {
  await ensureAlumniAuthTables();
  const netId = normalizeNetId(raw);
  const existing = await getAccountByNetId(netId);
  if (existing && existing.id !== accountId) {
    throw new Error("That GTown NetID is already on another login.");
  }
  try {
    const rows = await query<AlumniAccountRow[]>(
      `UPDATE alumni_accounts SET net_id = $2, updated_at = now() WHERE id = $1 RETURNING id, email, net_id`,
      [accountId, netId],
    );
    const account = rows[0];
    if (!account) throw new Error("That alumni login was not found.");
    return toAlumniAccount(account);
  } catch (error) {
    if (isNetIdUniqueConflict(error)) {
      throw new Error("That GTown NetID is already on another login.");
    }
    throw error;
  }
}

export async function registerAlumniAccount(input: {
  lastName: string;
  classYear: string;
  email: string;
  password: string;
  alumniIds: string[];
  firstName?: string;
  createIfMissing?: boolean;
  /** Forgot-password path: replace the password on an existing login and reclaim its rows. */
  replaceExisting?: boolean;
  photos?: AlumniPhotoPatch;
  linkedinUrl?: string | null;
}) {
  await ensureAlumniAuthTables();
  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
  if (input.password.length < 8) throw new Error("Password must be at least 8 characters.");

  const existing = await getAccountByEmail(email);
  if (existing && !input.replaceExisting) {
    throw new Error("That email already has an alumni login. Sign in instead.");
  }
  if (input.replaceExisting && !existing) {
    // Fall through to a normal first-time registration with the same form.
  }

  const { lastName, classYear, matches } = await lookupRosterMatches(
    input.lastName,
    input.classYear,
    existing?.id,
  );
  const selected = matches.filter((row) => input.alumniIds.includes(row.id));
  const claimedByOther = selected.filter((row) => row.claimed && !row.claimed_by_me);
  if (claimedByOther.length > 0) {
    throw new Error(
      input.replaceExisting
        ? "One of those roster rows is claimed by a different login. Use that account’s email, or contact the coaching staff."
        : "One of those roster rows is already claimed. Contact the coaching staff.",
    );
  }

  let idsToClaim = selected
    .filter((row) => !row.claimed || row.claimed_by_me)
    .map((row) => row.id);
  if (idsToClaim.length === 0 && input.createIfMissing) {
    const firstName = input.firstName?.trim();
    if (!firstName) throw new Error("Enter your first name to create a new roster row.");
    const created = await query<Array<{ id: string }>>(
      `
      INSERT INTO alumni (first_name, last_name, full_name, class_year, source_flags)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING id
      `,
      [firstName, lastName, `${firstName} ${lastName}`, classYear, JSON.stringify({ self_register: true })],
    );
    idsToClaim = [created[0]!.id];
  }
  if (idsToClaim.length === 0) {
    throw new Error(
      input.replaceExisting
        ? "Select your roster row and use the email on that alumni login to set a new password."
        : "Select a roster match, or create a new row if yours is missing.",
    );
  }

  const passwordHash = hashAlumniPassword(input.password);
  let account: AlumniAccount;
  if (existing) {
    await query(`UPDATE alumni_accounts SET password_hash = $1, updated_at = now() WHERE id = $2`, [
      passwordHash,
      existing.id,
    ]);
    account = toAlumniAccount(existing);
  } else {
    const createdAccount = await query<AlumniAccountRow[]>(
      `INSERT INTO alumni_accounts (email, password_hash) VALUES ($1, $2) RETURNING id, email, net_id`,
      [email, passwordHash],
    );
    account = toAlumniAccount(createdAccount[0]!);
  }
  for (const alumniId of idsToClaim) {
    await query(`INSERT INTO alumni_claims (account_id, alumni_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
      account.id,
      alumniId,
    ]);
    // Registration always writes the Verified Hoya badge onto the claimed roster row.
    const { grantVerifiedHoya } = await import("@/lib/badges");
    await grantVerifiedHoya(alumniId);
    if (input.linkedinUrl) {
      await updateOwnAlumniRecord(alumniId, { linkedin_url: input.linkedinUrl });
    }
    if (input.photos && Object.keys(input.photos).length > 0) {
      await updateAlumniPhotos(alumniId, input.photos);
    }
  }
  return { account, claimedIds: idsToClaim, classYear, lastName, replaced: Boolean(existing) };
}

export async function authenticateAlumni(identifier: string, password: string) {
  const account = await getAccountByIdentifier(identifier);
  if (!account || !verifyAlumniPassword(password, account.password_hash)) {
    throw new Error("That GTown NetID, email, or password is not recognized.");
  }
  return { id: account.id, email: account.email, netId: account.net_id?.trim() ? account.net_id.trim().toLowerCase() : null };
}

export function alumDisplayName(
  record?: {
    preferred_name?: string | null;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null,
  fallback = "",
) {
  const preferred = record?.preferred_name?.trim();
  if (preferred) return preferred;
  const full = record?.full_name?.trim();
  if (full) return full;
  const parts = [record?.first_name, record?.last_name].map((value) => value?.trim()).filter(Boolean);
  if (parts.length) return parts.join(" ");
  return fallback;
}

export async function alumSessionIdentityForAccount(account: { id: string; email: string }): Promise<{
  role: AlumRole;
  alumniId: string;
  email: string;
  name: string;
}> {
  const records = await getClaimedRecords(account.id);
  const primary = records[0];
  if (!primary) {
    throw new Error("Claim a roster row before signing in.");
  }
  for (const record of records) {
    await grantVerifiedHoyaForAlumSession(record.id);
  }
  return {
    role: ALUM_ROLE,
    alumniId: primary.id,
    email: account.email,
    name: alumDisplayName(primary, account.email),
  };
}

export type AlumniMeIdentity = {
  hasAlumSession: boolean;
  accountId: string | null;
  alumniId: string | null;
  email: string | null;
  name: string | null;
};

/** Sync cookie read — contract, locker preview, or legacy claim token. */
export function readAlumniMeSession(cookies: CookieJar): Omit<AlumniMeIdentity, "accountId"> {
  const token = cookies.get(ALUM_SESSION_COOKIE)?.value;
  const session = parseAlumSessionToken(token);
  if (session) {
    return {
      hasAlumSession: true,
      alumniId: isPreviewAlumSession(session) ? null : session.alumniId,
      email: session.email || null,
      name: session.name || null,
    };
  }
  const locker = readHoyaAlumSession(token);
  if (locker) {
    return { hasAlumSession: true, alumniId: null, email: null, name: locker.label };
  }
  const claim = readAlumniSessionFromCookies((name) => cookies.get(name)?.value);
  if (claim) {
    return { hasAlumSession: true, alumniId: null, email: null, name: null };
  }
  return { hasAlumSession: false, alumniId: null, email: null, name: null };
}

export async function resolveAlumniMeIdentity(cookies: CookieJar): Promise<AlumniMeIdentity> {
  const session = readAlumniMeSession(cookies);
  if (!session.hasAlumSession) {
    return { ...session, accountId: null };
  }
  let accountId: string | null = null;
  if (session.email) {
    try {
      accountId = (await getAccountByEmail(session.email))?.id ?? null;
    } catch {
      accountId = null;
    }
  }
  if (!accountId) {
    const claim = readAlumniSessionFromCookies((name) => cookies.get(name)?.value);
    if (claim && !claim.accountId.startsWith("locker:")) {
      accountId = claim.accountId;
    }
  }
  return { ...session, accountId };
}

export async function accountIdFromCookies(cookies: CookieJar) {
  const identity = await resolveAlumniMeIdentity(cookies);
  return identity.accountId;
}

async function hydrateAlumniRecords(people: Array<ClaimedRecord>): Promise<ClaimedRecord[]> {
  const records: ClaimedRecord[] = [];
  for (const person of people) {
    const [emails, phones, rosterYears] = await Promise.all([
      query<ClaimedRecord["emails"]>(
        `SELECT id, alumni_id, email, label FROM alumni_emails WHERE alumni_id = $1 ORDER BY id`,
        [person.id],
      ),
      query<ClaimedRecord["phones"]>(
        `SELECT id, alumni_id, phone, label FROM alumni_phones WHERE alumni_id = $1 ORDER BY id`,
        [person.id],
      ),
      query<ClaimedRecord["roster_years"]>(
        `SELECT id, alumni_id, year, position, class FROM alumni_roster_years WHERE alumni_id = $1 ORDER BY year`,
        [person.id],
      ),
    ]);
    records.push({ ...person, emails, phones, roster_years: rosterYears });
  }
  return records;
}

export async function getClaimedRecords(accountId: string): Promise<ClaimedRecord[]> {
  await ensureAlumniAuthTables();
  const people = await query<Array<ClaimedRecord>>(
    `
    SELECT ${LIST_COLUMNS}, a.source_flags, a.created_at, a.updated_at, c.created_at AS claimed_at
    FROM alumni_claims c
    JOIN alumni a ON a.id = c.alumni_id
    WHERE c.account_id = $1
    ORDER BY a.class_year DESC NULLS LAST, lower(a.last_name), lower(coalesce(a.first_name, ''))
    `,
    [accountId],
  );
  return hydrateAlumniRecords(people);
}

export async function getAlumniRecordsByIds(alumniIds: string[]): Promise<ClaimedRecord[]> {
  const ids = [...new Set(alumniIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return [];
  await ensureAlumniAuthTables();
  const people = await query<Array<ClaimedRecord>>(
    `
    SELECT ${LIST_COLUMNS}, a.source_flags, a.created_at, a.updated_at, a.updated_at AS claimed_at
    FROM alumni a
    WHERE a.id = ANY($1::uuid[])
    ORDER BY a.class_year DESC NULLS LAST, lower(a.last_name), lower(coalesce(a.first_name, ''))
    `,
    [ids],
  );
  return hydrateAlumniRecords(people);
}

export async function getAlumniRecordsForMe(input: { accountId?: string | null; alumniId?: string | null }) {
  if (input.accountId) {
    const claimed = await getClaimedRecords(input.accountId);
    if (claimed.length > 0) return claimed;
  }
  if (input.alumniId) return getAlumniRecordsByIds([input.alumniId]);
  return [];
}

export async function loadAlumniMeState(cookies: CookieJar) {
  const identity = await resolveAlumniMeIdentity(cookies);
  if (!identity.hasAlumSession) return null;
  const account = identity.accountId ? await getAccountById(identity.accountId) : null;
  const records = await getAlumniRecordsForMe({
    accountId: identity.accountId,
    alumniId: identity.alumniId,
  });
  const lastName = records[0]?.last_name ?? "";
  const mergeCandidates =
    lastName && identity.accountId
      ? await findSameLastNameCandidates(
          lastName,
          identity.accountId,
          records.map((row) => row.id),
        )
      : [];
  return { identity, account, records, mergeCandidates };
}

export async function claimAdditionalRecord(accountId: string, alumniId: string) {
  await ensureAlumniAuthTables();
  const records = await getClaimedRecords(accountId);
  if (records.length === 0) throw new Error("No claimed records on this account.");
  const lastNames = new Set(records.map((row) => row.last_name.trim().toLowerCase()));
  const target = await query<ClaimMatch[]>(
    `
    SELECT ${LIST_COLUMNS},
      EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id) AS claimed,
      EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id AND c.account_id = $2) AS claimed_by_me
    FROM alumni a WHERE a.id = $1 LIMIT 1
    `,
    [alumniId, accountId],
  );
  const row = target[0];
  if (!row) throw new Error("That roster row was not found.");
  if (!lastNames.has(row.last_name.trim().toLowerCase())) {
    throw new Error("You can only claim another row with the same roster last name.");
  }
  if (row.claimed && !row.claimed_by_me) {
    throw new Error("That roster row is already claimed.");
  }
  await query(`INSERT INTO alumni_claims (account_id, alumni_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
    accountId,
    alumniId,
  ]);
  await grantVerifiedHoyaForAlumSession(alumniId);
}

const EDITABLE_FIELDS = OVERVIEW_COLUMN_FIELDS;

export type AlumniEditInput = OverviewInput;

async function replaceAlumniOverviewEmails(alumniId: string, emails: string[]) {
  const keep = emails.map((email) => email.toLowerCase());
  if (keep.length === 0) {
    await query(`DELETE FROM alumni_emails WHERE alumni_id = $1`, [alumniId]);
    return;
  }
  await query(
    `
    DELETE FROM alumni_emails
    WHERE alumni_id = $1
      AND NOT (lower(email) = ANY($2::text[]))
    `,
    [alumniId, keep],
  );
  for (const email of emails) {
    await query(
      `
      INSERT INTO alumni_emails (alumni_id, email, label)
      SELECT $1, $2, 'profile'
      WHERE NOT EXISTS (
        SELECT 1 FROM alumni_emails
        WHERE alumni_id = $1 AND lower(email) = lower($2)
      )
      `,
      [alumniId, email],
    );
  }
}

async function applyAlumniEdit(alumniId: string, patch: AlumniEditInput) {
  const { columns, emails } = overviewInputToAlumniPatch(patch);
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const field of EDITABLE_FIELDS) {
    if (!(field in columns)) continue;
    params.push(columns[field] ?? null);
    sets.push(`${field} = $${params.length}`);
  }
  if (sets.length > 0) {
    params.push(alumniId);
    await query(
      `UPDATE alumni SET ${sets.join(", ")}, updated_at = now() WHERE id = $${params.length}`,
      params,
    );
  } else if (emails !== undefined) {
    await query(`UPDATE alumni SET updated_at = now() WHERE id = $1`, [alumniId]);
  }
  if (emails !== undefined) {
    await replaceAlumniOverviewEmails(alumniId, emails);
  }
}

export async function updateOwnAlumniRecord(alumniId: string, patch: AlumniEditInput) {
  await ensureAlumniAuthTables();
  await applyAlumniEdit(alumniId, patch);
}

export async function updateClaimedRecord(accountId: string, alumniId: string, patch: AlumniEditInput) {
  await ensureAlumniAuthTables();
  const owned = await query<Array<{ alumni_id: string }>>(
    `SELECT alumni_id FROM alumni_claims WHERE account_id = $1 AND alumni_id = $2`,
    [accountId, alumniId],
  );
  if (!owned[0]) throw new Error("You can only edit a record you have claimed.");
  await applyAlumniEdit(alumniId, patch);
}

function pickFilled(keeper: string | null, source: string | null) {
  const keep = keeper?.trim();
  if (keep) return keep;
  const next = source?.trim();
  return next || null;
}

async function loadMergeRow(alumniId: string, accountId?: string | null) {
  const rows = await query<ClaimMatch[]>(
    `
    SELECT ${LIST_COLUMNS},
      EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id) AS claimed,
      EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id AND c.account_id = $2) AS claimed_by_me
    FROM alumni a WHERE a.id = $1 LIMIT 1
    `,
    [alumniId, accountId ?? "00000000-0000-0000-0000-000000000000"],
  );
  return rows[0] ?? null;
}

export async function mergeAlumniRecords(
  accountId: string,
  keeperId: string,
  sourceId: string,
): Promise<void> {
  await mergeAlumniPair({ accountId, keeperId, sourceId, asAdmin: false });
}

export async function mergeAlumniPair(input: {
  keeperId: string;
  sourceId: string;
  accountId?: string | null;
  asAdmin?: boolean;
  sessionAlumniId?: string | null;
}) {
  await ensureAlumniAuthTables();
  const { keeperId, sourceId, accountId = null, asAdmin = false, sessionAlumniId = null } = input;
  if (keeperId === sourceId) throw new Error("Choose two different records to merge.");

  const keeper = await loadMergeRow(keeperId, accountId);
  const source = await loadMergeRow(sourceId, accountId);
  if (!keeper || !source) throw new Error("The record to merge was not found.");
  if (!isLikelyDuplicate(keeper, source) && keeper.last_name.trim().toLowerCase() !== source.last_name.trim().toLowerCase()) {
    throw new Error("Those rows do not look like the same person.");
  }

  const ownsKeeper = Boolean(
    asAdmin || keeper.claimed_by_me || (sessionAlumniId && sessionAlumniId === keeperId),
  );
  if (!ownsKeeper) {
    throw new Error("Keep the record you already claimed.");
  }
  if (!asAdmin && source.claimed && !source.claimed_by_me) {
    throw new Error("That roster row is claimed by another alumni login.");
  }
  if (!asAdmin && keeper.last_name.trim().toLowerCase() !== source.last_name.trim().toLowerCase()) {
    throw new Error("You can only merge rows that share the same roster last name.");
  }

  // HTTP transaction: pass query promises without awaiting so Neon runs them atomically.
  // $1/$2 are uuids; $3 repeats keeperId as text for attendee_key (cannot reuse one
  // param as both uuid and text — Postgres raises "inconsistent types deduced").
  const sql = getSql();
  const q = (text: string, params: unknown[] = []) => sql.query(text, params);

  await sql.transaction([
    ...(accountId && !source.claimed_by_me
      ? [
          q(`INSERT INTO alumni_claims (account_id, alumni_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
            accountId,
            sourceId,
          ]),
        ]
      : []),
    q(
      `
      UPDATE alumni SET
        first_name = COALESCE(NULLIF(btrim(first_name), ''), $2),
        preferred_name = COALESCE(NULLIF(btrim(preferred_name), ''), $3),
        full_name = COALESCE(NULLIF(btrim(full_name), ''), $4),
        position = COALESCE(NULLIF(btrim(position), ''), $5),
        seasons = COALESCE(NULLIF(btrim(seasons), ''), $6),
        class_year = COALESCE(NULLIF(btrim(class_year), ''), $7),
        hometown_city = COALESCE(NULLIF(btrim(hometown_city), ''), $8),
        hometown_state = COALESCE(NULLIF(btrim(hometown_state), ''), $9),
        current_city = COALESCE(NULLIF(btrim(current_city), ''), $10),
        current_state = COALESCE(NULLIF(btrim(current_state), ''), $11),
        company_name = COALESCE(NULLIF(btrim(company_name), ''), $12),
        job_title = COALESCE(NULLIF(btrim(job_title), ''), $13),
        industry = COALESCE(NULLIF(btrim(industry), ''), $14),
        linkedin_url = COALESCE(NULLIF(btrim(linkedin_url), ''), $15),
        headline = COALESCE(NULLIF(btrim(headline), ''), $16),
        email_primary = COALESCE(NULLIF(btrim(email_primary), ''), $17),
        phone_primary = COALESCE(NULLIF(btrim(phone_primary), ''), $18),
        address_primary = COALESCE(NULLIF(btrim(address_primary), ''), $19),
        football_photo_url = COALESCE(NULLIF(btrim(football_photo_url), ''), $20),
        linkedin_photo_url = COALESCE(NULLIF(btrim(linkedin_photo_url), ''), $21),
        source_flags = COALESCE(source_flags, '{}'::jsonb) || jsonb_build_object('merged_from', $22::text),
        updated_at = now()
      WHERE id = $1
      `,
      [
        keeperId,
        pickFilled(keeper.first_name, source.first_name),
        pickFilled(keeper.preferred_name, source.preferred_name),
        pickFilled(keeper.full_name, source.full_name),
        pickFilled(keeper.position, source.position),
        pickFilled(keeper.seasons, source.seasons),
        pickFilled(keeper.class_year, source.class_year),
        pickFilled(keeper.hometown_city, source.hometown_city),
        pickFilled(keeper.hometown_state, source.hometown_state),
        pickFilled(keeper.current_city, source.current_city),
        pickFilled(keeper.current_state, source.current_state),
        pickFilled(keeper.company_name, source.company_name),
        pickFilled(keeper.job_title, source.job_title),
        pickFilled(keeper.industry, source.industry),
        pickFilled(keeper.linkedin_url, source.linkedin_url),
        pickFilled(keeper.headline, source.headline),
        pickFilled(keeper.email_primary, source.email_primary),
        pickFilled(keeper.phone_primary, source.phone_primary),
        pickFilled(keeper.address_primary, source.address_primary),
        pickFilled(keeper.football_photo_url ?? null, source.football_photo_url ?? null),
        pickFilled(keeper.linkedin_photo_url ?? null, source.linkedin_photo_url ?? null),
        sourceId,
      ],
    ),
    q(
      `
      INSERT INTO alumni_emails (alumni_id, email, label)
      SELECT alumni_id, email, label
      FROM (
        SELECT DISTINCT ON (lower(email))
          alumni_id, email, label
        FROM (
          SELECT $1::uuid AS alumni_id, e.email, e.label, 1 AS priority
          FROM alumni_emails e
          WHERE e.alumni_id = $2::uuid
          UNION ALL
          SELECT $1::uuid, btrim(a.email_primary), 'merged', 2
          FROM alumni a
          WHERE a.id = $2::uuid
            AND a.email_primary IS NOT NULL AND btrim(a.email_primary) <> ''
        ) candidates
        ORDER BY lower(email), priority
      ) deduped
      WHERE NOT EXISTS (
        SELECT 1 FROM alumni_emails k
        WHERE k.alumni_id = deduped.alumni_id AND lower(k.email) = lower(deduped.email)
      )
      ON CONFLICT (alumni_id, lower(email)) DO NOTHING
      `,
      [keeperId, sourceId],
    ),
    q(
      `
      INSERT INTO alumni_phones (alumni_id, phone, label)
      SELECT alumni_id, phone, label
      FROM (
        SELECT DISTINCT ON (phone)
          alumni_id, phone, label
        FROM (
          SELECT $1::uuid AS alumni_id, p.phone, p.label, 1 AS priority
          FROM alumni_phones p
          WHERE p.alumni_id = $2::uuid
          UNION ALL
          SELECT $1::uuid, btrim(a.phone_primary), 'merged', 2
          FROM alumni a
          WHERE a.id = $2::uuid
            AND a.phone_primary IS NOT NULL AND btrim(a.phone_primary) <> ''
        ) candidates
        ORDER BY phone, priority
      ) deduped
      WHERE NOT EXISTS (
        SELECT 1 FROM alumni_phones k
        WHERE k.alumni_id = deduped.alumni_id AND k.phone = deduped.phone
      )
      `,
      [keeperId, sourceId],
    ),
    q(
      `
      INSERT INTO alumni_roster_years (alumni_id, year, position, class)
      SELECT $1, r.year, r.position, r.class
      FROM alumni_roster_years r
      WHERE r.alumni_id = $2
        AND NOT EXISTS (
          SELECT 1 FROM alumni_roster_years k
          WHERE k.alumni_id = $1 AND k.year = r.year
        )
      `,
      [keeperId, sourceId],
    ),
    q(`UPDATE text_blast_recipients SET alumni_id = $1 WHERE alumni_id = $2`, [keeperId, sourceId]),
    q(`UPDATE email_blast_recipients SET alumni_id = $1 WHERE alumni_id = $2`, [keeperId, sourceId]),
    q(`UPDATE push_blast_recipients SET alumni_id = $1 WHERE alumni_id = $2`, [keeperId, sourceId]),
    q(`UPDATE fundraising_pledges SET alumni_id = $1 WHERE alumni_id = $2`, [keeperId, sourceId]),
    q(`UPDATE giving_pledges SET alumni_id = $1 WHERE alumni_id = $2`, [keeperId, sourceId]),
    q(`UPDATE staff_roles SET alumni_id = $1 WHERE alumni_id = $2`, [keeperId, sourceId]),
    q(
      `
      UPDATE alumni_group_members AS source
      SET alumni_id = $1
      WHERE alumni_id = $2
        AND NOT EXISTS (
          SELECT 1 FROM alumni_group_members keeper
          WHERE keeper.group_id = source.group_id AND keeper.alumni_id = $1
        )
      `,
      [keeperId, sourceId],
    ),
    q(`DELETE FROM alumni_group_members WHERE alumni_id = $1`, [sourceId]),
    q(
      `
      UPDATE alum_badges AS source
      SET alumni_id = $1
      WHERE alumni_id = $2
        AND NOT EXISTS (
          SELECT 1 FROM alum_badges keeper
          WHERE keeper.alumni_id = $1 AND keeper.badge_type = source.badge_type
        )
      `,
      [keeperId, sourceId],
    ),
    q(`DELETE FROM alum_badges WHERE alumni_id = $1`, [sourceId]),
    q(`UPDATE alumni_crm_notes SET alumni_id = $1 WHERE alumni_id = $2`, [keeperId, sourceId]),
    q(`UPDATE contact_notes SET alumni_id = $1 WHERE alumni_id = $2`, [keeperId, sourceId]),
    q(
      `
      DELETE FROM event_checkins AS source
      WHERE source.alumni_id = $2::uuid
        AND EXISTS (
          SELECT 1 FROM event_checkins AS keeper
          WHERE keeper.event_id = source.event_id
            AND (
              keeper.alumni_id = $1::uuid
              OR keeper.attendee_key = 'alum:' || $3
            )
        )
      `,
      [keeperId, sourceId, keeperId],
    ),
    q(
      `
      UPDATE event_checkins
      SET alumni_id = $1::uuid,
          attendee_key = 'alum:' || $3
      WHERE alumni_id = $2::uuid
      `,
      [keeperId, sourceId, keeperId],
    ),
    q(
      `INSERT INTO alumni_record_merges (account_id, keeper_alumni_id, merged_alumni_id) VALUES ($1, $2, $3)`,
      [accountId, keeperId, sourceId],
    ),
    // alumni_claims.alumni_id is globally unique — drop source claim if keeper is already claimed.
    q(
      `
      DELETE FROM alumni_claims src
      WHERE src.alumni_id = $2
        AND EXISTS (SELECT 1 FROM alumni_claims k WHERE k.alumni_id = $1)
      `,
      [keeperId, sourceId],
    ),
    q(
      `
      UPDATE alumni_claims SET alumni_id = $1
      WHERE alumni_id = $2
        AND NOT EXISTS (SELECT 1 FROM alumni_claims k WHERE k.alumni_id = $1)
      `,
      [keeperId, sourceId],
    ),
    q(`DELETE FROM alumni_claims WHERE alumni_id = $1`, [sourceId]),
    q(`DELETE FROM alumni_emails WHERE alumni_id = $1`, [sourceId]),
    q(`DELETE FROM alumni_phones WHERE alumni_id = $1`, [sourceId]),
    q(`DELETE FROM alumni_roster_years WHERE alumni_id = $1`, [sourceId]),
    q(`DELETE FROM alumni WHERE id = $1`, [sourceId]),
  ]);
}
