import { getSql } from "@/lib/db";
import { ensureGivingPledgesTable } from "@/lib/giving-schema";

export const IMPACT_AMOUNT_DOLLARS = [25, 50, 100, 250] as const;
export const UNPAID_INTENT_STATUS = "unpaid_intent";
export const MIN_PLEDGE_CENTS = 100;
export const MAX_PLEDGE_CENTS = 10_000_000;
export const MAX_DONOR_LABEL_LENGTH = 80;

export type GivingPledge = {
  id: string;
  amount_cents: number;
  donor_label: string | null;
  status: string;
  created_at: string;
};

export type GivingLeaderRow = {
  donor_label: string;
  amount_cents: number;
  pledge_count: number;
};

export type GivingSummary = {
  pledges: GivingPledge[];
  leaders: GivingLeaderRow[];
  totals: {
    count: number;
    amount_cents: number;
  };
};

export const emptyGivingSummary: GivingSummary = {
  pledges: [],
  leaders: [],
  totals: { count: 0, amount_cents: 0 },
};

export function dollarsToCents(value: unknown): number | null {
  let amount: number | null = null;
  if (typeof value === "number") {
    amount = value;
  } else if (typeof value === "string") {
    const cleaned = value.trim().replace(/[$,\s]/g, "");
    if (!cleaned) return null;
    amount = Number.parseFloat(cleaned);
  }
  if (amount === null || !Number.isFinite(amount) || amount <= 0) return null;
  const cents = Math.round(amount * 100);
  if (cents < MIN_PLEDGE_CENTS || cents > MAX_PLEDGE_CENTS) return null;
  return cents;
}

export function normalizeDonorLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const label = value.trim().slice(0, MAX_DONOR_LABEL_LENGTH);
  return label || null;
}

export function formatPledgeDollars(cents: number) {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(dollars);
}

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

export async function listGivingSummary(limit = 12): Promise<GivingSummary> {
  await ensureGivingPledgesTable();
  const [pledges, leaders, totals] = await Promise.all([
    query<GivingPledge[]>(
      `
      SELECT id, amount_cents, donor_label, status, created_at
      FROM giving_pledges
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [limit],
    ),
    query<GivingLeaderRow[]>(
      `
      SELECT
        COALESCE(NULLIF(btrim(donor_label), ''), 'Anonymous') AS donor_label,
        COALESCE(SUM(amount_cents), 0)::int AS amount_cents,
        COUNT(*)::int AS pledge_count
      FROM giving_pledges
      GROUP BY 1
      ORDER BY 2 DESC, 1 ASC
      LIMIT 8
      `,
    ),
    query<Array<{ count: number; amount_cents: number }>>(
      `
      SELECT COUNT(*)::int AS count, COALESCE(SUM(amount_cents), 0)::int AS amount_cents
      FROM giving_pledges
      `,
    ),
  ]);

  return {
    pledges,
    leaders,
    totals: totals[0] ?? { count: 0, amount_cents: 0 },
  };
}

export async function createGivingPledge(input: { amountCents: number; donorLabel?: string | null }) {
  await ensureGivingPledgesTable();
  const rows = await query<GivingPledge[]>(
    `
    INSERT INTO giving_pledges (amount_cents, donor_label, status)
    VALUES ($1, $2, $3)
    RETURNING id, amount_cents, donor_label, status, created_at
    `,
    [input.amountCents, input.donorLabel ?? null, UNPAID_INTENT_STATUS],
  );
  return rows[0];
}
