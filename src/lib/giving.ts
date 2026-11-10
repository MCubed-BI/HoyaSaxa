import { attachDonorLeaderBadges, type PublicBadge } from "@/lib/badges";
import { getSql } from "@/lib/db";
import {
  FIVE_YEAR_AMOUNT_DOLLARS,
  LETTERMAN_JACKET,
  TAILGATE_SPONSORSHIP,
  designationLabel,
  normalizeGivingPiece,
  type GivingDesignationId,
  type LettermanJacketVariant,
  type TailgateMode,
} from "@/lib/fundraising-plan";
import { ensureGivingPledgesTable } from "@/lib/giving-schema";

export const IMPACT_AMOUNT_DOLLARS = [25, 50, 100, 250] as const;
export const UNPAID_INTENT_STATUS = "unpaid_intent";
export const MIN_PLEDGE_CENTS = 100;
export const MAX_PLEDGE_CENTS = 10_000_000;
export const MAX_DONOR_LABEL_LENGTH = 80;
export const MAX_SUIT_SIZE_LENGTH = 40;
export const MAX_TAILGATE_THEME_LENGTH = 120;
export const MAX_TAILGATE_GAME_LENGTH = 120;

export type GivingPledgeDetails = {
  jacketVariant?: LettermanJacketVariant;
  suitSize?: string;
  /** @deprecated Legacy theme pledges only — new tailgates are game-only. */
  tailgateTheme?: string;
  /** Game the donor is sponsoring ($250 ea). */
  tailgateGame?: string;
  /** per_game ($250) or entire_event ($4000). */
  tailgateMode?: TailgateMode;
  /** Annual amount for a 5-year commitment (dollars). */
  annualDollars?: number;
};

export type GivingPledge = {
  id: string;
  amount_cents: number;
  donor_label: string | null;
  status: string;
  created_at: string;
  designation: GivingDesignationId | string;
  details: GivingPledgeDetails;
};

export type GivingLeaderRow = {
  donor_label: string;
  amount_cents: number;
  pledge_count: number;
  badge?: PublicBadge | null;
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

export function normalizeDesignation(value: unknown): GivingDesignationId {
  return normalizeGivingPiece(value);
}

function normalizeJacketVariant(value: unknown): LettermanJacketVariant | null {
  if (value === "self") return "self";
  if (value === "donate" || value === "player_sponsor") return "donate";
  return null;
}

function normalizeSuitSize(value: unknown): string | null {
  return normalizeShortText(value, MAX_SUIT_SIZE_LENGTH);
}

function normalizeShortText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ").slice(0, max);
  return text || null;
}

function normalizeTailgateMode(value: unknown): TailgateMode | null {
  if (value === "per_game" || value === "entire_event") return value;
  return null;
}

function isFiveYearAnnualDollars(value: number): value is (typeof FIVE_YEAR_AMOUNT_DOLLARS)[number] {
  return (FIVE_YEAR_AMOUNT_DOLLARS as readonly number[]).includes(value);
}

function normalizeFiveYearAnnualDollars(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && isFiveYearAnnualDollars(value)) {
    return value;
  }
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/[$,\s]/g, "");
    if (!cleaned) return null;
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed) && isFiveYearAnnualDollars(parsed)) return parsed;
  }
  return null;
}

export function parseGivingDetails(raw: unknown): GivingPledgeDetails {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const row = raw as Record<string, unknown>;
  const details: GivingPledgeDetails = {};
  const jacketVariant = normalizeJacketVariant(row.jacketVariant);
  if (jacketVariant) details.jacketVariant = jacketVariant;
  const suitSize = normalizeSuitSize(row.suitSize);
  if (suitSize) details.suitSize = suitSize;
  const theme = normalizeShortText(row.tailgateTheme, MAX_TAILGATE_THEME_LENGTH);
  if (theme) details.tailgateTheme = theme;
  const game = normalizeShortText(row.tailgateGame, MAX_TAILGATE_GAME_LENGTH);
  if (game) details.tailgateGame = game;
  const mode = normalizeTailgateMode(row.tailgateMode);
  if (mode) details.tailgateMode = mode;
  const annual = normalizeFiveYearAnnualDollars(row.annualDollars);
  if (annual) details.annualDollars = annual;
  return details;
}

export type ParsedGivingPledgeInput =
  | { ok: true; amountCents: number; designation: GivingDesignationId; details: GivingPledgeDetails }
  | { ok: false; error: string };

/**
 * Resolve amount + designation rules for 5-Year / One-time / Letterman / Tailgate.
 */
export function resolveGivingPledgeInput(input: {
  amountDollars?: unknown;
  amountCents?: unknown;
  designation?: unknown;
  jacketVariant?: unknown;
  suitSize?: unknown;
  tailgateTheme?: unknown;
  tailgateGame?: unknown;
  tailgateMode?: unknown;
}): ParsedGivingPledgeInput {
  const designation = normalizeDesignation(input.designation);
  const details = parseGivingDetails({
    jacketVariant: input.jacketVariant,
    suitSize: input.suitSize,
    tailgateTheme: input.tailgateTheme,
    tailgateGame: input.tailgateGame,
    tailgateMode: input.tailgateMode,
  });

  if (designation === "five_year") {
    const annualDollars =
      normalizeFiveYearAnnualDollars(input.amountDollars) ??
      (typeof input.amountCents === "number" && Number.isInteger(input.amountCents)
        ? normalizeFiveYearAnnualDollars(input.amountCents / 100)
        : null) ??
      details.annualDollars ??
      null;
    if (annualDollars === null) {
      return { ok: false, error: "Choose a 5-year annual amount of $25k, $10k, $5k, or $1k." };
    }
    details.annualDollars = annualDollars;
    return { ok: true, amountCents: annualDollars * 100, designation, details };
  }

  if (designation === "letterman_jacket") {
    const variant =
      normalizeJacketVariant(input.jacketVariant) ??
      normalizeJacketVariant(details.jacketVariant);
    if (!variant) {
      return { ok: false, error: "Choose Sponsor or Purchase for the letter jacket." };
    }
    details.jacketVariant = variant;
    const dollars =
      variant === "self" ? LETTERMAN_JACKET.selfDollars : LETTERMAN_JACKET.donateDollars;
    if (variant === "self") {
      const suitSize = normalizeSuitSize(input.suitSize) ?? details.suitSize;
      if (!suitSize) {
        return { ok: false, error: "Add a suit size to purchase a letter jacket." };
      }
      details.suitSize = suitSize;
    } else {
      delete details.suitSize;
    }
    return { ok: true, amountCents: dollars * 100, designation, details };
  }

  if (designation === "tailgate") {
    const modeFromAmount = (() => {
      const amountCents =
        dollarsToCents(input.amountDollars) ??
        (typeof input.amountCents === "number" && Number.isInteger(input.amountCents)
          ? input.amountCents
          : null);
      if (amountCents === TAILGATE_SPONSORSHIP.entireEventDollars * 100) return "entire_event" as const;
      if (amountCents === TAILGATE_SPONSORSHIP.perGameDollars * 100) return "per_game" as const;
      return null;
    })();
    const mode =
      normalizeTailgateMode(input.tailgateMode) ??
      normalizeTailgateMode(details.tailgateMode) ??
      modeFromAmount;
    if (!mode) {
      return { ok: false, error: "Choose $250 ea or $4,000 to sponsor the entire event." };
    }
    details.tailgateMode = mode;
    delete details.tailgateTheme;

    if (mode === "entire_event") {
      delete details.tailgateGame;
      return {
        ok: true,
        amountCents: TAILGATE_SPONSORSHIP.entireEventDollars * 100,
        designation,
        details,
      };
    }

    const game =
      normalizeShortText(input.tailgateGame, MAX_TAILGATE_GAME_LENGTH) ?? details.tailgateGame;
    if (!game) {
      return { ok: false, error: "Choose a game for the $250 tailgate sponsorship." };
    }
    details.tailgateGame = game;
    return {
      ok: true,
      amountCents: TAILGATE_SPONSORSHIP.perGameDollars * 100,
      designation,
      details,
    };
  }

  const amountCents =
    dollarsToCents(input.amountDollars) ??
    (typeof input.amountCents === "number" && Number.isInteger(input.amountCents)
      ? input.amountCents
      : typeof input.amountCents === "string" && /^\d+$/.test(input.amountCents.trim())
        ? Number(input.amountCents)
        : null);

  if (
    amountCents === null ||
    !Number.isInteger(amountCents) ||
    amountCents < MIN_PLEDGE_CENTS ||
    amountCents > MAX_PLEDGE_CENTS
  ) {
    return { ok: false, error: "Choose a valid one-time amount of at least $1." };
  }

  return { ok: true, amountCents, designation: "one_time", details: {} };
}

export function formatPledgePurpose(pledge: Pick<GivingPledge, "designation" | "details" | "amount_cents">) {
  const designation = normalizeDesignation(pledge.designation);
  const label = designationLabel(designation);
  if (designation === "five_year") {
    const annual =
      pledge.details.annualDollars ??
      (pledge.amount_cents > 0 ? Math.round(pledge.amount_cents / 100) : null);
    return annual ? `${label} · $${annual.toLocaleString("en-US")}/yr` : label;
  }
  if (designation === "letterman_jacket") {
    const variant =
      pledge.details.jacketVariant === "self"
        ? `Purchase${pledge.details.suitSize ? ` · size ${pledge.details.suitSize}` : ""}`
        : "Sponsor";
    return `${label} · ${variant}`;
  }
  if (designation === "tailgate") {
    if (pledge.details.tailgateMode === "entire_event" || pledge.amount_cents === TAILGATE_SPONSORSHIP.entireEventDollars * 100) {
      return `${label} · Entire event`;
    }
    const game = pledge.details.tailgateGame || pledge.details.tailgateTheme || "TBD";
    return `${label} · ${game}`;
  }
  return label;
}

export { formatCurrency as formatPledgeDollars } from "@/lib/format";
export { designationLabel };

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

function mapPledgeRow(row: Record<string, unknown>): GivingPledge {
  return {
    id: String(row.id),
    amount_cents: Number(row.amount_cents) || 0,
    donor_label: typeof row.donor_label === "string" ? row.donor_label : null,
    status: String(row.status ?? UNPAID_INTENT_STATUS),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ""),
    designation: normalizeDesignation(row.designation),
    details: parseGivingDetails(row.details),
  };
}

export async function listGivingSummary(limit = 12): Promise<GivingSummary> {
  await ensureGivingPledgesTable();
  const [pledgeRows, leaders, totals] = await Promise.all([
    query<Array<Record<string, unknown>>>(
      `
      SELECT id, amount_cents, donor_label, status, created_at, designation, details
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
    pledges: pledgeRows.map(mapPledgeRow),
    leaders: await attachDonorLeaderBadges(leaders),
    totals: totals[0] ?? { count: 0, amount_cents: 0 },
  };
}

export async function createGivingPledge(input: {
  amountCents: number;
  donorLabel?: string | null;
  alumniId?: string | null;
  designation?: GivingDesignationId | string;
  details?: GivingPledgeDetails;
}) {
  await ensureGivingPledgesTable();
  const designation = normalizeDesignation(input.designation);
  const details = parseGivingDetails(input.details ?? {});
  const rows = await query<Array<Record<string, unknown>>>(
    `
    INSERT INTO giving_pledges (amount_cents, donor_label, status, alumni_id, designation, details)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    RETURNING id, amount_cents, donor_label, status, created_at, designation, details
    `,
    [
      input.amountCents,
      input.donorLabel ?? null,
      UNPAID_INTENT_STATUS,
      input.alumniId ?? null,
      designation,
      JSON.stringify(details),
    ],
  );
  return mapPledgeRow(rows[0] ?? {});
}
