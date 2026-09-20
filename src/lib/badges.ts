/**
 * Badge primitives. Never expose donor dollar amounts in UI or public JSON.
 *
 * Types:
 *   - verified_hoya — granted on claim / alumni login
 *   - donor_platinum | donor_gold | donor_silver | donor_bronze
 *   - event_top_platinum | event_top_gold | event_top_silver | event_top_bronze
 *
 * Donor rank uses giving_pledges / fundraising_pledges when those tables exist.
 * Event / Top Tailgate bands consume GET /api/events/attendance/feed ranks.
 * This file never INSERTs event_checkins. Pages load via badges-attendance.ts.
 *
 * Coder 4 / 5: import `@/lib/badge-api` (HoyaBadge + consume helpers).
 */
import { isPreviewAlumniId } from "@/lib/alum-preview";
import {
  attendanceLeadersFromCoder4Feed,
  isAlumniUuid,
  normalizeAlumniId,
  type EventBadgeFeed,
  type EventBadgeFeedRow,
  type EventBadgeTotals,
} from "@/lib/badge-event-feed";
import {
  addCentsByKey,
  donorCohortKey,
  loadAlumniNameIndex,
  resolveAttendanceAlumId,
  unmatchedDonorKey,
  type AlumniIdentity,
} from "@/lib/badge-identity";
import { getDatabaseUrl, getSql } from "@/lib/db";
import { ensureGivingPledgesTable } from "@/lib/giving-schema";

export const BADGE_TYPES = [
  "verified_hoya",
  "donor_platinum",
  "donor_gold",
  "donor_silver",
  "donor_bronze",
  "event_top_platinum",
  "event_top_gold",
  "event_top_silver",
  "event_top_bronze",
] as const;

export type BadgeType = (typeof BADGE_TYPES)[number];
export type BadgeTier = "platinum" | "gold" | "silver" | "bronze";

/** Inclusive lower bounds. Same cutoffs for donor_* and event_top_*. */
export const BADGE_PERCENTILE_THRESHOLDS = {
  platinum: 99,
  gold: 90,
  silver: 75,
  bronze: 50,
} as const;

export const BADGE_LABELS: Record<BadgeType, string> = {
  verified_hoya: "Verified Hoya",
  donor_platinum: "Donor · Platinum",
  donor_gold: "Donor · Gold",
  donor_silver: "Donor · Silver",
  donor_bronze: "Donor · Bronze",
  event_top_platinum: "Top Tailgate · Platinum",
  event_top_gold: "Top Tailgate · Gold",
  event_top_silver: "Top Tailgate · Silver",
  event_top_bronze: "Top Tailgate · Bronze",
};

/** Public badge — no cents, no dollars, no raw rank numbers required by UI. */
export type PublicBadge = {
  type: BadgeType;
  label: string;
  tier: BadgeTier | null;
};

export type BadgeGrant = {
  alumniId: string;
  type: BadgeType;
  grantedAt: string;
};

const TIER_ORDER: BadgeTier[] = ["platinum", "gold", "silver", "bronze"];

export function isBadgeType(value: string | null | undefined): value is BadgeType {
  return Boolean(value && (BADGE_TYPES as readonly string[]).includes(value));
}

export function badgeLabel(type: BadgeType) {
  return BADGE_LABELS[type];
}

export function toPublicBadge(type: BadgeType): PublicBadge {
  return {
    type,
    label: badgeLabel(type),
    tier: tierFromBadgeType(type),
  };
}

export function tierFromBadgeType(type: BadgeType): BadgeTier | null {
  if (type === "verified_hoya") return null;
  const match = type.match(/(platinum|gold|silver|bronze)$/);
  return match ? (match[1] as BadgeTier) : null;
}

export function donorBadgeType(tier: BadgeTier): BadgeType {
  return `donor_${tier}`;
}

export function eventTopBadgeType(tier: BadgeTier): BadgeType {
  return `event_top_${tier}`;
}

/**
 * Coder 4 owns rank + percentile. Prefer their percentile when it is 0–100;
 * else rank/cohortSize. Rank-only still yields a chip (rank 1 = Platinum).
 * Does not use attendanceCount (that would re-rank). Returns null below Bronze
 * when a real percentile/cohort is known.
 */
export function eventTierFromCoder4Feed(input: {
  rank?: number | null;
  percentile?: number | null;
  cohortSize?: number | null;
}): BadgeTier | null {
  const rank = input.rank == null ? Number.NaN : Number(input.rank);
  const cohort = input.cohortSize == null ? Number.NaN : Number(input.cohortSize);
  const raw = input.percentile == null ? Number.NaN : Number(input.percentile);
  if (Number.isFinite(raw) && raw > 1) {
    return tierFromPercentile(raw);
  }
  if (Number.isFinite(rank) && rank >= 1 && Number.isFinite(cohort) && cohort >= 1) {
    return tierFromPercentile(percentileFromRank(rank, cohort));
  }
  if (Number.isFinite(raw) && raw > 0 && raw <= 1) {
    return tierFromPercentile(raw * 100);
  }
  if (Number.isFinite(rank) && rank >= 1) {
    return rank === 1 ? "platinum" : "bronze";
  }
  return null;
}

export function hasUsableAttendanceRank(input: {
  rank?: number | null;
  percentile?: number | null;
  cohortSize?: number | null;
}) {
  const rank = input.rank == null ? Number.NaN : Number(input.rank);
  const percentile = input.percentile == null ? Number.NaN : Number(input.percentile);
  return (Number.isFinite(rank) && rank >= 1) || (Number.isFinite(percentile) && percentile > 0);
}

export function eventBadgeFromCoder4Totals(totals: EventBadgeTotals | null | undefined): PublicBadge | null {
  if (!totals) return null;
  const tier = eventTierFromCoder4Feed(totals);
  return tier ? toPublicBadge(eventTopBadgeType(tier)) : null;
}

export function eventBadgeFromCoder4Row(row: EventBadgeFeedRow | null | undefined): PublicBadge | null {
  if (!row) return null;
  const tier = eventTierFromCoder4Feed(row);
  return tier ? toPublicBadge(eventTopBadgeType(tier)) : null;
}

export function tierFromPercentile(percentile: number): BadgeTier | null {
  if (!Number.isFinite(percentile)) return null;
  if (percentile >= BADGE_PERCENTILE_THRESHOLDS.platinum) return "platinum";
  if (percentile >= BADGE_PERCENTILE_THRESHOLDS.gold) return "gold";
  if (percentile >= BADGE_PERCENTILE_THRESHOLDS.silver) return "silver";
  if (percentile >= BADGE_PERCENTILE_THRESHOLDS.bronze) return "bronze";
  return null;
}

/**
 * Rank 1 of N uses the same 1/10/25/50 cutoffs as `tierFromPercentile`.
 * Discrete ranks skip Gold until N≥10 (rank 2 of 9 is 88.9). Pull the next
 * still-in-top-50% donor up into any skipped band so all four labels can
 * exist when the giving cohort is large enough — no invented dollars.
 */
export function tierFromRank(rank: number, population: number): BadgeTier | null {
  if (!Number.isFinite(rank) || !Number.isFinite(population) || rank < 1 || population < 1) {
    return null;
  }
  const assigned: Array<BadgeTier | null> = [];
  const percentiles: number[] = [];
  for (let r = 1; r <= population; r++) {
    const percentile = percentileFromRank(r, population);
    percentiles[r] = percentile;
    assigned[r] = tierFromPercentile(percentile);
  }
  for (const need of TIER_ORDER) {
    if (assigned.includes(need)) continue;
    const needIdx = TIER_ORDER.indexOf(need);
    const candidate = assigned.findIndex((tier, index) => {
      if (!tier) return false;
      if ((percentiles[index] ?? 0) < BADGE_PERCENTILE_THRESHOLDS.bronze) return false;
      return TIER_ORDER.indexOf(tier) > needIdx;
    });
    if (candidate >= 0) assigned[candidate] = need;
  }
  return assigned[rank] ?? null;
}

/** Rank 1 of N → 100. Rank 2 of 100 → 99. Rank N of N → 100/N. */
export function percentileFromRank(rank: number, population: number) {
  if (!Number.isFinite(rank) || !Number.isFinite(population) || rank < 1 || population < 1) {
    return 0;
  }
  return (1 - (rank - 1) / population) * 100;
}

export function highestTier(tiers: Array<BadgeTier | null | undefined>): BadgeTier | null {
  for (const tier of TIER_ORDER) {
    if (tiers.includes(tier)) return tier;
  }
  return null;
}

/** Strip any accidental amount fields before a badge leaves the server. */
export function publicBadgesJson(badges: PublicBadge[]) {
  return badges.map((badge) => ({
    type: badge.type,
    label: badge.label,
    tier: badge.tier,
  }));
}

let badgesEnsured = false;

export async function ensureAlumBadgesTable() {
  if (badgesEnsured) return;
  const sql = getSql();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS alum_badges (
      alumni_id uuid NOT NULL,
      badge_type text NOT NULL,
      granted_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (alumni_id, badge_type)
    )
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS alum_badges_type
    ON alum_badges (badge_type, granted_at DESC)
  `);
  badgesEnsured = true;
}

export async function grantBadge(alumniId: string, type: BadgeType) {
  if (!getDatabaseUrl() || !alumniId.trim()) return null;
  await ensureAlumBadgesTable();
  const sql = getSql();
  const rows = (await sql.query(
    `
    INSERT INTO alum_badges (alumni_id, badge_type)
    VALUES ($1, $2)
    ON CONFLICT (alumni_id, badge_type) DO UPDATE SET granted_at = alum_badges.granted_at
    RETURNING alumni_id::text AS "alumniId", badge_type AS type, granted_at::text AS "grantedAt"
    `,
    [alumniId, type],
  )) as BadgeGrant[];
  return rows[0] ?? null;
}

/**
 * Claim / alumni login grant. Preview Alum (no real roster id) is session-only —
 * chrome still shows Verified Hoya via `isVerifiedHoyaIdentity`.
 */
export async function grantVerifiedHoyaForAlumSession(alumniId: string | null | undefined) {
  const id = alumniId?.trim() ?? "";
  if (!id || isPreviewAlumniId(id)) return null;
  try {
    return await grantVerifiedHoya(id);
  } catch {
    return null;
  }
}

/** Claim / login contract: every claimed roster row becomes a Verified Hoya. */
export async function grantVerifiedHoya(alumniId: string) {
  if (!getDatabaseUrl() || !alumniId.trim()) return null;
  try {
    const sql = getSql();
    await sql.query(
      `
      UPDATE alumni
      SET source_flags = COALESCE(source_flags, '{}'::jsonb) || '{"verified_hoya": true}'::jsonb,
          updated_at = now()
      WHERE id = $1
      `,
      [alumniId],
    );
  } catch {
    // Additive flag; badge row is the source of truth if alumni update fails.
  }
  return grantBadge(alumniId, "verified_hoya");
}

export async function listStoredBadges(alumniId: string): Promise<PublicBadge[]> {
  if (!getDatabaseUrl() || !alumniId.trim()) return [];
  try {
    await ensureAlumBadgesTable();
    const sql = getSql();
    const rows = (await sql.query(
      `SELECT badge_type AS type FROM alum_badges WHERE alumni_id = $1`,
      [alumniId],
    )) as Array<{ type: string }>;
    return rows.flatMap((row) => (isBadgeType(row.type) ? [toPublicBadge(row.type)] : []));
  } catch {
    return [];
  }
}

export type DonorTotal = { key: string; total_cents: number };

async function tableExists(tableName: string) {
  const sql = getSql();
  const rows = (await sql.query(`SELECT to_regclass($1) AS name`, [`public.${tableName}`])) as Array<{
    name: string | null;
  }>;
  return Boolean(rows[0]?.name);
}

async function columnNames(tableName: string) {
  const sql = getSql();
  const rows = (await sql.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    `,
    [tableName],
  )) as Array<{ column_name: string }>;
  return new Set(rows.map((row) => row.column_name));
}

async function loadFundraisingDonorTotals(alumni: AlumniIdentity[]): Promise<DonorTotal[]> {
  if (!(await tableExists("fundraising_pledges"))) return [];
  const sql = getSql();
  const totals = new Map<string, number>();
  const names = await columnNames("fundraising_pledges");
  if (names.has("alumni_id")) {
    const rows = (await sql.query(
      `
      SELECT alumni_id::text AS key, COALESCE(SUM(amount_cents), 0)::bigint AS total_cents
      FROM fundraising_pledges
      WHERE alumni_id IS NOT NULL AND amount_cents IS NOT NULL
      GROUP BY alumni_id
      `,
    )) as Array<{ key: string; total_cents: string | number }>;
    for (const row of rows) addCentsByKey(totals, row.key, Number(row.total_cents));
  }
  if (names.has("name")) {
    const rows = (await sql.query(
      `
      SELECT name AS label, COALESCE(SUM(amount_cents), 0)::bigint AS total_cents
      FROM fundraising_pledges
      WHERE ${names.has("alumni_id") ? "alumni_id IS NULL AND" : ""}
        NULLIF(btrim(name), '') IS NOT NULL
        AND amount_cents IS NOT NULL
      GROUP BY name
      `,
    )) as Array<{ label: string; total_cents: string | number }>;
    for (const row of rows) {
      addCentsByKey(totals, donorCohortKey(row.label, alumni), Number(row.total_cents));
    }
  }
  await addUnlinkedAnonymousCents(totals, "fundraising_pledges", names.has("alumni_id"), names.has("name") ? "name" : null);
  return [...totals.entries()].map(([key, total_cents]) => ({ key, total_cents }));
}

async function loadGivingDonorTotals(alumni: AlumniIdentity[]): Promise<DonorTotal[]> {
  await ensureGivingPledgesTable().catch(() => undefined);
  if (!(await tableExists("giving_pledges"))) return [];
  const sql = getSql();
  const totals = new Map<string, number>();
  const names = await columnNames("giving_pledges");
  if (names.has("alumni_id")) {
    const rows = (await sql.query(
      `
      SELECT alumni_id::text AS key, COALESCE(SUM(amount_cents), 0)::bigint AS total_cents
      FROM giving_pledges
      WHERE alumni_id IS NOT NULL AND amount_cents IS NOT NULL
      GROUP BY alumni_id
      `,
    )) as Array<{ key: string; total_cents: string | number }>;
    for (const row of rows) addCentsByKey(totals, row.key, Number(row.total_cents));
  }
  if (names.has("donor_label")) {
    const rows = (await sql.query(
      `
      SELECT donor_label AS label, COALESCE(SUM(amount_cents), 0)::bigint AS total_cents
      FROM giving_pledges
      WHERE ${names.has("alumni_id") ? "alumni_id IS NULL AND" : ""}
        NULLIF(btrim(donor_label), '') IS NOT NULL
        AND amount_cents IS NOT NULL
      GROUP BY donor_label
      `,
    )) as Array<{ label: string; total_cents: string | number }>;
    for (const row of rows) {
      addCentsByKey(totals, donorCohortKey(row.label, alumni), Number(row.total_cents));
    }
  }
  await addUnlinkedAnonymousCents(totals, "giving_pledges", names.has("alumni_id"), names.has("donor_label") ? "donor_label" : null);
  return [...totals.entries()].map(([key, total_cents]) => ({ key, total_cents }));
}

async function addUnlinkedAnonymousCents(
  totals: Map<string, number>,
  tableName: string,
  hasAlumniId: boolean,
  labelColumn: string | null,
) {
  const sql = getSql();
  const labelFilter = labelColumn
    ? `AND NULLIF(btrim(COALESCE(${labelColumn}, '')), '') IS NULL`
    : "";
  const alumniFilter = hasAlumniId ? "alumni_id IS NULL" : "TRUE";
  const rows = (await sql.query(
    `
    SELECT COALESCE(SUM(amount_cents), 0)::bigint AS total_cents
    FROM ${tableName}
    WHERE ${alumniFilter}
      ${labelFilter}
      AND amount_cents IS NOT NULL
      AND amount_cents > 0
    `,
  )) as Array<{ total_cents: string | number }>;
  addCentsByKey(totals, unmatchedDonorKey(null), Number(rows[0]?.total_cents));
}

/** Isolated per-table reads — a fundraising schema miss must not wipe /giving. */
export async function loadDonorTotals(): Promise<DonorTotal[]> {
  const totals = new Map<string, number>();
  const alumni = await loadAlumniNameIndex().catch(() => [] as AlumniIdentity[]);
  const fundraising = await loadFundraisingDonorTotals(alumni).catch(() => [] as DonorTotal[]);
  const giving = await loadGivingDonorTotals(alumni).catch(() => [] as DonorTotal[]);
  for (const row of [...fundraising, ...giving]) addCentsByKey(totals, row.key, row.total_cents);
  return [...totals.entries()].map(([key, total_cents]) => ({ key, total_cents }));
}

function scoreDonorTotals(totals: DonorTotal[]) {
  return totals
    .filter((row) => row.total_cents > 0 && (normalizeAlumniId(row.key) || row.key.trim()))
    .sort((a, b) => b.total_cents - a.total_cents || a.key.localeCompare(b.key));
}

export function rankDonorTotals(totals: DonorTotal[]) {
  const scored = scoreDonorTotals(totals);
  return scored.map((row, index) => {
    const rank = index + 1;
    return {
      key: normalizeAlumniId(row.key) || row.key,
      rank,
      tier: tierFromRank(rank, scored.length),
    };
  });
}

export function donorTierForAlumniId(alumniId: string, totals: DonorTotal[]): BadgeTier | null {
  const wanted = normalizeAlumniId(alumniId) || alumniId.trim();
  if (!wanted) return null;
  const ranked = rankDonorTotals(totals);
  return ranked.find((row) => row.key === wanted)?.tier ?? null;
}

export function donorBadgeForCohortKey(key: string, totals: DonorTotal[]): PublicBadge | null {
  const tier = donorTierForAlumniId(key, totals);
  return tier ? toPublicBadge(donorBadgeType(tier)) : null;
}

/** Giving leaderboard chips — labels only, never `$` / `amount_cents`. */
export async function attachDonorLeaderBadges<T extends { donor_label: string }>(
  leaders: T[],
): Promise<Array<T & { badge: PublicBadge | null }>> {
  if (!leaders.length) return leaders.map((row) => ({ ...row, badge: null }));
  try {
    const alumni = await loadAlumniNameIndex().catch(() => [] as AlumniIdentity[]);
    const totals = await loadDonorTotals();
    return leaders.map((row) => {
      const badge = donorBadgeForCohortKey(donorCohortKey(row.donor_label, alumni), totals);
      return { ...row, badge: badge ? publicBadgesJson([badge])[0]! : null };
    });
  } catch {
    return leaders.map((row) => ({ ...row, badge: null }));
  }
}

export async function computeDonorBadge(alumniId: string): Promise<PublicBadge | null> {
  if (!getDatabaseUrl() || !alumniId.trim()) return null;
  try {
    const totals = await loadDonorTotals();
    const tier = donorTierForAlumniId(alumniId, totals);
    return tier ? toPublicBadge(donorBadgeType(tier)) : null;
  } catch {
    return null;
  }
}

type EventCount = { key: string; checkins: number };

export function eventSlugFromTitle(title: string, eventId: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = eventId.replace(/-/g, "").slice(0, 8);
  return slug ? `${slug}-${suffix}` : eventId;
}

function rankByAttendanceCount<T extends { attendanceCount: number }>(rows: T[]) {
  const sorted = [...rows].sort((a, b) => b.attendanceCount - a.attendanceCount);
  const cohortSize = sorted.length;
  let lastCount = Number.NaN;
  let lastRank = 0;
  return sorted.map((row, index) => {
    const rank = row.attendanceCount === lastCount ? lastRank : index + 1;
    lastCount = row.attendanceCount;
    lastRank = rank;
    return {
      ...row,
      rank,
      percentile: percentileFromRank(rank, cohortSize),
      cohortSize,
    };
  });
}

/**
 * Consume-only Coder 4 feed shape from `event_checkins`.
 * Same fields as `listEventCheckinFeed` / `GET /api/events/attendance/feed`.
 * Never INSERT. Lifetime ranks are computed here only until PR #15 is on the tree;
 * pass `attendanceLeaders` to skip this and use Coder 4's ranks.
 */
export async function consumeEventCheckinFeed(input?: { alumId?: string }): Promise<EventBadgeFeed> {
  const empty: EventBadgeFeed = { rows: [], leaders: [] };
  if (!getDatabaseUrl() || !(await tableExists("event_checkins"))) return empty;
  const sql = getSql();
  const hasEvents = await tableExists("events");
  const join = hasEvents ? "LEFT JOIN events e ON e.id = a.event_id" : "";
  const titleExpr = hasEvents ? "e.title" : "NULL";
  const records = (await sql.query(
    `
    SELECT
      a.event_id::text AS event_id,
      a.alumni_id::text AS alum_id,
      COALESCE(a.alumni_id::text, a.attendee_key) AS user_id,
      a.attendee_key,
      a.display_name,
      a.checked_in_at,
      ${titleExpr} AS event_title
    FROM event_checkins a
    ${join}
    ORDER BY a.checked_in_at DESC
    LIMIT 1000
    `,
  ).catch(() =>
    sql.query(
      `
      SELECT
        a.event_id::text AS event_id,
        a.alumni_id::text AS alum_id,
        COALESCE(a.alumni_id::text, a.attendee_key) AS user_id,
        a.attendee_key,
        NULL AS display_name,
        a.checked_in_at,
        ${titleExpr} AS event_title
      FROM event_checkins a
      ${join}
      ORDER BY a.checked_in_at DESC
      LIMIT 1000
      `,
    ),
  )) as Array<{
    event_id: string;
    alum_id: string | null;
    user_id: string;
    attendee_key: string | null;
    display_name: string | null;
    checked_in_at: string | Date;
    event_title: string | null;
  }>;

  const alumni = await loadAlumniNameIndex().catch(() => [] as AlumniIdentity[]);
  const counts = new Map<string, { alumId: string; userId: string; attendanceCount: number }>();
  for (const row of records) {
    const alumId = resolveAttendanceAlumId(
      {
        alumId: row.alum_id,
        userId: row.user_id,
        personKey: row.attendee_key,
        displayName: row.display_name,
      },
      alumni,
    );
    if (!alumId) continue;
    const prev = counts.get(alumId);
    counts.set(alumId, {
      alumId,
      userId: row.user_id || alumId,
      attendanceCount: (prev?.attendanceCount ?? 0) + 1,
    });
  }
  const leaders = rankByAttendanceCount([...counts.values()]);
  const byAlum = new Map(leaders.map((row) => [row.alumId, row]));
  const rows: EventBadgeFeedRow[] = [];
  for (const row of records) {
    const alumId =
      resolveAttendanceAlumId(
        {
          alumId: row.alum_id,
          userId: row.user_id,
          personKey: row.attendee_key,
          displayName: row.display_name,
        },
        alumni,
      ) || null;
    if (!alumId) continue;
    if (input?.alumId && normalizeAlumniId(alumId) !== normalizeAlumniId(input.alumId)) continue;
    const lifetime = byAlum.get(alumId);
    const title = row.event_title?.trim() ?? "";
    const eventId = row.event_id;
    const checkedInAt = row.checked_in_at instanceof Date ? row.checked_in_at.toISOString() : String(row.checked_in_at);
    rows.push({
      eventId,
      eventSlug: eventSlugFromTitle(title, eventId),
      eventTitle: title || undefined,
      alumId,
      userId: row.user_id || alumId,
      checkedInAt,
      attendanceCount: lifetime?.attendanceCount ?? 1,
      rank: lifetime?.rank ?? 0,
      percentile: lifetime?.percentile ?? 0,
      cohortSize: lifetime?.cohortSize,
    });
  }
  return { rows, leaders };
}

export function eventTierForAlumniId(alumniId: string, rows: EventCount[]): BadgeTier | null {
  const scored = rows
    .filter((row) => row.checkins > 0)
    .sort((a, b) => b.checkins - a.checkins || a.key.localeCompare(b.key));
  const rank = scored.findIndex((row) => row.key === alumniId) + 1;
  if (rank < 1) return null;
  return tierFromPercentile(percentileFromRank(rank, scored.length));
}

export async function computeEventTopBadge(
  alumniId: string,
  coder4?: { totals?: EventBadgeTotals | null },
): Promise<PublicBadge | null> {
  if (coder4 && "totals" in coder4) {
    const badge = eventBadgeFromCoder4Totals(coder4.totals);
    if (badge) return badge;
    if (coder4.totals && hasUsableAttendanceRank(coder4.totals)) return null;
  }
  if (!getDatabaseUrl() || !alumniId.trim()) return null;
  try {
    const feed = await consumeEventCheckinFeed({ alumId: alumniId });
    const wanted = normalizeAlumniId(alumniId);
    const totals = attendanceLeadersFromCoder4Feed(feed).find(
      (row) => normalizeAlumniId(row.alumId) === wanted,
    );
    return eventBadgeFromCoder4Totals(totals);
  } catch {
    return null;
  }
}

export function assemblePublicBadges(input: {
  stored?: PublicBadge[];
  donorTier?: BadgeTier | null;
  eventTier?: BadgeTier | null;
  verified?: boolean;
}): PublicBadge[] {
  const byType = new Map<BadgeType, PublicBadge>();
  for (const badge of input.stored ?? []) {
    if (input.donorTier && badge.type.startsWith("donor_")) continue;
    byType.set(badge.type, badge);
  }
  if (input.verified) byType.set("verified_hoya", toPublicBadge("verified_hoya"));
  if (input.donorTier) {
    const type = donorBadgeType(input.donorTier);
    byType.set(type, toPublicBadge(type));
  }
  if (input.eventTier) {
    const type = eventTopBadgeType(input.eventTier);
    byType.set(type, toPublicBadge(type));
  }
  return publicBadgesJson([...byType.values()]);
}

export async function listPublicBadges(
  alumniId: string,
  options?: { attendanceTotals?: EventBadgeTotals | null },
): Promise<PublicBadge[]> {
  const stored = await listStoredBadges(alumniId);
  const [donor, eventTop, claimed, flagged] = await Promise.all([
    computeDonorBadge(alumniId),
    options && "attendanceTotals" in options
      ? computeEventTopBadge(alumniId, { totals: options.attendanceTotals })
      : computeEventTopBadge(alumniId),
    isAlumniClaimed(alumniId),
    loadVerifiedFlagIds([alumniId]).then((set) => set.has(normalizeAlumniId(alumniId))),
  ]);
  return assemblePublicBadges({
    stored,
    donorTier: donor?.tier ?? null,
    eventTier: eventTop?.tier ?? null,
    verified: stored.some((badge) => badge.type === "verified_hoya") || claimed || flagged,
  });
}

function uuidAlumniIds(ids: string[]) {
  return [...new Set(ids.map((id) => normalizeAlumniId(id)).filter((id) => isAlumniUuid(id)))];
}

function uuidInClause(ids: string[], start = 1) {
  const unique = uuidAlumniIds(ids);
  return {
    ids: unique,
    sql: unique.map((_, index) => `$${start + index}::uuid`).join(", "),
    params: unique,
  };
}

async function listStoredBadgesMany(alumniIds: string[]): Promise<Map<string, PublicBadge[]>> {
  const out = new Map<string, PublicBadge[]>();
  const { ids, sql: inSql, params } = uuidInClause(alumniIds);
  if (!ids.length || !getDatabaseUrl()) return out;
  await ensureAlumBadgesTable();
  const sql = getSql();
  const rows = (await sql.query(
    `SELECT alumni_id::text AS id, badge_type AS type FROM alum_badges WHERE alumni_id IN (${inSql})`,
    params,
  )) as Array<{ id: string; type: string }>;
  for (const row of rows) {
    if (!isBadgeType(row.type)) continue;
    const id = normalizeAlumniId(row.id);
    if (!id) continue;
    const list = out.get(id) ?? [];
    list.push(toPublicBadge(row.type));
    out.set(id, list);
  }
  return out;
}

async function loadClaimedIds(alumniIds: string[]): Promise<Set<string>> {
  const claimed = new Set<string>();
  const { ids, sql: inSql, params } = uuidInClause(alumniIds);
  if (!ids.length || !getDatabaseUrl() || !(await tableExists("alumni_claims"))) return claimed;
  const sql = getSql();
  const rows = (await sql.query(
    `SELECT DISTINCT alumni_id::text AS id FROM alumni_claims WHERE alumni_id IN (${inSql})`,
    params,
  )) as Array<{ id: string }>;
  for (const row of rows) {
    const id = normalizeAlumniId(row.id);
    if (id) claimed.add(id);
  }
  return claimed;
}

async function loadVerifiedFlagIds(alumniIds: string[]): Promise<Set<string>> {
  const flagged = new Set<string>();
  const { ids, sql: inSql, params } = uuidInClause(alumniIds);
  if (!ids.length || !getDatabaseUrl() || !(await tableExists("alumni"))) return flagged;
  try {
    const sql = getSql();
    const rows = (await sql.query(
      `
      SELECT id::text AS id
      FROM alumni
      WHERE id IN (${inSql})
        AND (
          source_flags->>'verified_hoya' = 'true'
          OR source_flags @> '{"verified_hoya": true}'::jsonb
        )
      `,
      params,
    )) as Array<{ id: string }>;
    for (const row of rows) {
      const id = normalizeAlumniId(row.id);
      if (id) flagged.add(id);
    }
  } catch {
    // source_flags is additive; claims / alum_badges still grant Verified Hoya.
  }
  return flagged;
}

async function isAlumniClaimed(alumniId: string) {
  try {
    const claimed = await loadClaimedIds([alumniId]);
    return claimed.has(normalizeAlumniId(alumniId));
  } catch {
    return false;
  }
}

/**
 * Directory/profile batch read. One donor + check-in scan, then per-id assemble.
 * Never returns gift totals. Extra `verifiedAlumniIds` mark claimed / logged-in rows.
 *
 * When `attendanceLeaders` is passed (Coder 4 `listEventCheckinFeed` / GET feed),
 * those ranks win. Omit it to use `consumeEventCheckinFeed` (SELECT-only).
 */
export async function listPublicBadgesMany(
  alumniIds: string[],
  options: { verifiedAlumniIds?: string[]; attendanceLeaders?: EventBadgeTotals[] } = {},
): Promise<Record<string, PublicBadge[]>> {
  const ids = [...new Set(alumniIds.filter(Boolean))];
  const out: Record<string, PublicBadge[]> = Object.fromEntries(ids.map((id) => [id, []]));
  if (!ids.length || !getDatabaseUrl()) return out;

  const uuidIds = uuidAlumniIds(ids);
  const storedById = await listStoredBadgesMany(uuidIds).catch(() => new Map<string, PublicBadge[]>());
  const totals = await loadDonorTotals().catch(() => [] as Array<{ key: string; total_cents: number }>);
  const feed = options.attendanceLeaders
    ? { rows: [], leaders: options.attendanceLeaders }
    : await consumeEventCheckinFeed().catch(() => ({ rows: [], leaders: [] }));
  const claimed = await loadClaimedIds(uuidIds).catch(() => new Set<string>());
  const flagged = await loadVerifiedFlagIds(uuidIds).catch(() => new Set<string>());
  const leadersByAlum = new Map(
    attendanceLeadersFromCoder4Feed(feed)
      .map((row) => [normalizeAlumniId(row.alumId), row] as const)
      .filter((entry): entry is [string, EventBadgeTotals] => Boolean(entry[0])),
  );
  const extraVerified = new Set((options.verifiedAlumniIds ?? []).map((id) => normalizeAlumniId(id) || id));
  for (const id of ids) {
    const key = normalizeAlumniId(id) || id;
    const stored = storedById.get(key) ?? [];
    out[id] = assemblePublicBadges({
      stored,
      donorTier: donorTierForAlumniId(key, totals),
      eventTier: eventTierFromCoder4Feed(leadersByAlum.get(key) ?? {}),
      verified:
        extraVerified.has(key) ||
        claimed.has(key) ||
        flagged.has(key) ||
        stored.some((badge) => badge.type === "verified_hoya"),
    });
  }
  return out;
}
