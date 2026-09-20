/**
 * Badge primitives. Never expose donor dollar amounts in UI or public JSON.
 *
 * Types:
 *   - verified_hoya — granted on claim / alumni login
 *   - donor_platinum | donor_gold | donor_silver | donor_bronze
 *   - event_top_platinum | event_top_gold | event_top_silver | event_top_bronze
 *
 * Donor rank uses giving_pledges / fundraising_pledges when those tables exist.
 * Event rank uses event_checkins once Coder 5 lands attendance (stub returns empty).
 */
import { getDatabaseUrl, getSql } from "@/lib/db";

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
  event_top_platinum: "Event top · Platinum",
  event_top_gold: "Event top · Gold",
  event_top_silver: "Event top · Silver",
  event_top_bronze: "Event top · Bronze",
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

export function tierFromPercentile(percentile: number): BadgeTier | null {
  if (!Number.isFinite(percentile)) return null;
  if (percentile >= BADGE_PERCENTILE_THRESHOLDS.platinum) return "platinum";
  if (percentile >= BADGE_PERCENTILE_THRESHOLDS.gold) return "gold";
  if (percentile >= BADGE_PERCENTILE_THRESHOLDS.silver) return "silver";
  if (percentile >= BADGE_PERCENTILE_THRESHOLDS.bronze) return "bronze";
  return null;
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

type DonorTotal = { key: string; total_cents: number };

async function tableExists(tableName: string) {
  const sql = getSql();
  const rows = (await sql.query(`SELECT to_regclass($1) AS name`, [`public.${tableName}`])) as Array<{
    name: string | null;
  }>;
  return Boolean(rows[0]?.name);
}

async function loadDonorTotals(): Promise<DonorTotal[]> {
  const sql = getSql();
  const totals = new Map<string, number>();

  if (await tableExists("fundraising_pledges")) {
    const rows = (await sql.query(
      `
      SELECT alumni_id::text AS key, COALESCE(SUM(amount_cents), 0)::bigint AS total_cents
      FROM fundraising_pledges
      WHERE alumni_id IS NOT NULL AND amount_cents IS NOT NULL
      GROUP BY alumni_id
      `,
    )) as Array<{ key: string; total_cents: string | number }>;
    for (const row of rows) {
      totals.set(row.key, Number(row.total_cents) || 0);
    }
  }

  if (await tableExists("giving_pledges")) {
    const cols = (await sql.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'giving_pledges'
      `,
    )) as Array<{ column_name: string }>;
    const names = new Set(cols.map((col) => col.column_name));
    if (names.has("alumni_id")) {
      const rows = (await sql.query(
        `
        SELECT alumni_id::text AS key, COALESCE(SUM(amount_cents), 0)::bigint AS total_cents
        FROM giving_pledges
        WHERE alumni_id IS NOT NULL
        GROUP BY alumni_id
        `,
      )) as Array<{ key: string; total_cents: string | number }>;
      for (const row of rows) {
        totals.set(row.key, (totals.get(row.key) ?? 0) + (Number(row.total_cents) || 0));
      }
    }
  }

  return [...totals.entries()].map(([key, total_cents]) => ({ key, total_cents }));
}

export function donorTierForAlumniId(alumniId: string, totals: DonorTotal[]): BadgeTier | null {
  const scored = totals
    .filter((row) => row.total_cents > 0)
    .sort((a, b) => b.total_cents - a.total_cents || a.key.localeCompare(b.key));
  const rank = scored.findIndex((row) => row.key === alumniId) + 1;
  if (rank < 1) return null;
  return tierFromPercentile(percentileFromRank(rank, scored.length));
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

async function loadEventAttendance(): Promise<{ ready: boolean; rows: EventCount[] }> {
  if (!(await tableExists("event_checkins"))) {
    return { ready: false, rows: [] };
  }
  const sql = getSql();
  const rows = (await sql.query(
    `
    SELECT alumni_id::text AS key, COUNT(*)::int AS checkins
    FROM event_checkins
    WHERE alumni_id IS NOT NULL
    GROUP BY alumni_id
    `,
  )) as Array<{ key: string; checkins: number }>;
  return { ready: rows.length > 0, rows };
}

export function eventTierForAlumniId(alumniId: string, rows: EventCount[]): BadgeTier | null {
  const scored = rows
    .filter((row) => row.checkins > 0)
    .sort((a, b) => b.checkins - a.checkins || a.key.localeCompare(b.key));
  const rank = scored.findIndex((row) => row.key === alumniId) + 1;
  if (rank < 1) return null;
  return tierFromPercentile(percentileFromRank(rank, scored.length));
}

export async function computeEventTopBadge(alumniId: string): Promise<PublicBadge | null> {
  if (!getDatabaseUrl() || !alumniId.trim()) return null;
  try {
    const attendance = await loadEventAttendance();
    if (!attendance.ready) return null;
    const tier = eventTierForAlumniId(alumniId, attendance.rows);
    return tier ? toPublicBadge(eventTopBadgeType(tier)) : null;
  } catch {
    return null;
  }
}

export async function listPublicBadges(alumniId: string): Promise<PublicBadge[]> {
  const stored = await listStoredBadges(alumniId);
  const [donor, eventTop] = await Promise.all([computeDonorBadge(alumniId), computeEventTopBadge(alumniId)]);
  const byType = new Map<BadgeType, PublicBadge>();
  for (const badge of stored) byType.set(badge.type, badge);
  if (donor) byType.set(donor.type, donor);
  if (eventTop) byType.set(eventTop.type, eventTop);
  if (!byType.has("verified_hoya") && stored.some((badge) => badge.type === "verified_hoya")) {
    byType.set("verified_hoya", toPublicBadge("verified_hoya"));
  }
  return publicBadgesJson([...byType.values()]);
}
