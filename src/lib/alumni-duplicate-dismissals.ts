/**
 * Permanent "Not me" dismissals for likely-duplicate / Merge accounts suggestions.
 *
 * Table: alumni_duplicate_dismissals (additive Neon, HoyaSaxa — not NTE).
 * Key: ordered alumni pair + actor. The pair never resurfaces for that actor.
 *
 * Scope:
 * - Claimed alum on /me or their own athlete profile: `account:{alumni_accounts.id}`
 *   (falls back to `alumni:{session alumni id}` when the claim account row is missing)
 * - Staff / platform admin: `admin:{username or label}`
 *
 * Dismissals are per actor, not global. An admin "Not me" does not hide the pair
 * from the claimed alum, and vice versa. Merge duplicate is unchanged.
 */
import { getSql } from "@/lib/db";

export type DuplicateDismissalActor = {
  accountId?: string | null;
  sessionAlumniId?: string | null;
  isAdmin?: boolean;
  label?: string | null;
};

let ensured = false;

export async function ensureAlumniDuplicateDismissalTable() {
  if (ensured) return;
  const sql = getSql();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS alumni_duplicate_dismissals (
      alumni_id_low uuid NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
      alumni_id_high uuid NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
      actor_key text NOT NULL,
      dismissed_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (alumni_id_low, alumni_id_high, actor_key)
    )
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS alumni_duplicate_dismissals_actor
    ON alumni_duplicate_dismissals (actor_key)
  `);
  ensured = true;
}

export function normalizeAlumniPair(left: string, right: string): [string, string] {
  const a = left.trim();
  const b = right.trim();
  if (!a || !b) throw new Error("Choose two different records.");
  if (a === b) throw new Error("Choose two different records.");
  return a < b ? [a, b] : [b, a];
}

/** Stable per-login key so a dismissal survives reload / new session for that actor. */
export function duplicateDismissalActorKey(actor: DuplicateDismissalActor): string | null {
  const accountId = actor.accountId?.trim();
  if (accountId) return `account:${accountId}`;
  const alumniId = actor.sessionAlumniId?.trim();
  if (alumniId) return `alumni:${alumniId}`;
  const label = actor.label?.trim().toLowerCase();
  if (actor.isAdmin && label) return `admin:${label}`;
  return null;
}

export function lookupAccountId(actor?: string | null | DuplicateDismissalActor) {
  if (!actor) return null;
  if (typeof actor === "string") return actor;
  return actor.accountId?.trim() || null;
}

export function dismissedSourceIdSet(
  pairs: Array<{ alumni_id_low: string; alumni_id_high: string }>,
  keeperIds: string[],
) {
  const keepers = new Set(keeperIds);
  const dismissed = new Set<string>();
  for (const pair of pairs) {
    if (keepers.has(pair.alumni_id_low)) dismissed.add(pair.alumni_id_high);
    if (keepers.has(pair.alumni_id_high)) dismissed.add(pair.alumni_id_low);
  }
  return dismissed;
}

export function excludeDismissedById<T extends { id: string }>(candidates: T[], dismissedSourceIds: Set<string>) {
  if (dismissedSourceIds.size === 0) return candidates;
  return candidates.filter((row) => !dismissedSourceIds.has(row.id));
}

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

export async function listDismissedDuplicatePairs(actorKey: string) {
  await ensureAlumniDuplicateDismissalTable();
  return query<Array<{ alumni_id_low: string; alumni_id_high: string }>>(
    `
    SELECT alumni_id_low, alumni_id_high
    FROM alumni_duplicate_dismissals
    WHERE actor_key = $1
    `,
    [actorKey],
  );
}

export async function listDismissedSourceIds(actorKey: string, keeperIds: string[]) {
  const ids = [...new Set(keeperIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return new Set<string>();
  const pairs = await listDismissedDuplicatePairs(actorKey);
  return dismissedSourceIdSet(pairs, ids);
}

export async function dismissDuplicatePair(input: {
  keeperId: string;
  sourceId: string;
  actorKey: string;
}) {
  await ensureAlumniDuplicateDismissalTable();
  const [low, high] = normalizeAlumniPair(input.keeperId, input.sourceId);
  await query(
    `
    INSERT INTO alumni_duplicate_dismissals (alumni_id_low, alumni_id_high, actor_key)
    VALUES ($1, $2, $3)
    ON CONFLICT (alumni_id_low, alumni_id_high, actor_key) DO NOTHING
    `,
    [low, high, input.actorKey],
  );
}
