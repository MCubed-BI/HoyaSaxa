/**
 * Giving options for /giving — three pieces only:
 * Recurring, Letterman Jacket, Tailgate.
 */

export const RECURRING_AMOUNTS = [
  { id: "bronze", label: "Bronze", amountDollars: 250 },
  { id: "silver", label: "Silver", amountDollars: 500 },
  { id: "gold", label: "Gold", amountDollars: 750 },
] as const;

export const RECURRING_AMOUNT_DOLLARS = RECURRING_AMOUNTS.map((row) => row.amountDollars);

export const LETTERMAN_JACKET = {
  donateDollars: 200,
  selfDollars: 240,
  suitSizes: ["36", "38", "40", "42", "44", "46", "48", "50", "52", "XS", "S", "M", "L", "XL", "2XL", "3XL"] as const,
} as const;

/** @deprecated Use donateDollars — kept for older pledge details. */
export const LETTERMAN_PLAYER_SPONSOR_DOLLARS = LETTERMAN_JACKET.donateDollars;

export const TAILGATE_SPONSORSHIP = {
  amountDollars: [250, 500, 1000, 5000] as const,
  themes: [
    "Homecoming",
    "Spring Game",
    "Season opener",
    "Senior Day",
    "Rivalry game",
    "Other / custom",
  ] as const,
} as const;

export const GIVING_PIECES = [
  {
    id: "recurring",
    label: "Recurring",
    summary: "Monthly/annual support — Bronze $250, Silver $500, Gold $750.",
  },
  {
    id: "letterman_jacket",
    label: "Letterman",
    summary: `Donate $${LETTERMAN_JACKET.donateDollars} for a player, or $${LETTERMAN_JACKET.selfDollars} for yourself (suit size).`,
  },
  {
    id: "tailgate",
    label: "Tailgate",
    summary: "Sponsor a game or theme — $250 / $500 / $1,000 / $5,000.",
  },
] as const;

export type GivingDesignationId = (typeof GIVING_PIECES)[number]["id"];
export type LettermanJacketVariant = "donate" | "self" | "player_sponsor";

/** Legacy designation ids still readable from older pledges. */
const LEGACY_DESIGNATION_MAP: Record<string, GivingDesignationId> = {
  subscription: "recurring",
  general: "recurring",
  coaches_fund: "recurring",
  player_scholarship: "recurring",
  facilities: "recurring",
  letterman_jacket: "letterman_jacket",
  tailgate: "tailgate",
  recurring: "recurring",
};

export function normalizeGivingPiece(value: unknown): GivingDesignationId {
  if (typeof value !== "string") return "recurring";
  const key = value.trim();
  return LEGACY_DESIGNATION_MAP[key] ?? "recurring";
}

export function designationLabel(id: string | null | undefined) {
  const piece = normalizeGivingPiece(id);
  return GIVING_PIECES.find((row) => row.id === piece)?.label ?? "Recurring";
}

export function recurringLabelForDollars(amountDollars: number) {
  return RECURRING_AMOUNTS.find((row) => row.amountDollars === amountDollars)?.label ?? null;
}

/** Back-compat aliases used by older imports/tests. */
export const GIVING_DESIGNATIONS = GIVING_PIECES;
export const SUBSCRIPTION_RANKS = RECURRING_AMOUNTS.map((row) => ({
  ...row,
  period: "yr" as const,
  approxMonthly: Math.round(row.amountDollars / 12),
  summary: `${row.label} recurring`,
}));
export const SUBSCRIPTION_AMOUNT_DOLLARS = RECURRING_AMOUNT_DOLLARS;
export const subscriptionRankForDollars = recurringLabelForDollars;
