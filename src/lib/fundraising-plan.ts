/**
 * Giving options for /giving — separate donation pages + leaderboard breakdowns.
 */

/** One-time gift presets (not a monthly bill). */
export const ONE_TIME_AMOUNTS = [
  { id: "250", amountDollars: 250 },
  { id: "500", amountDollars: 500 },
  { id: "750", amountDollars: 750 },
] as const;

export const ONE_TIME_AMOUNT_DOLLARS = ONE_TIME_AMOUNTS.map((row) => row.amountDollars);

/**
 * Leaderboard gift bands — informational breakdowns (from the fundraising plan).
 * Shown on /giving/leaderboard, not as a monthly subscription ask.
 */
export const GIFT_BANDS = [
  {
    id: "bronze",
    label: "Bronze",
    amountDollars: 250,
    summary: "Entry gift band.",
  },
  {
    id: "silver",
    label: "Silver",
    amountDollars: 500,
    summary: "Mid gift band.",
  },
  {
    id: "gold",
    label: "Gold",
    amountDollars: 750,
    summary: "Top gift band below the benefit ladder.",
  },
] as const;

/** Annual benefit ladder ranks & rewards (from the fundraising plan). */
export const BENEFIT_LADDER = [
  {
    id: "founders",
    label: "Founders",
    amountDollars: 25_000,
    rewards: [
      "Season tickets",
      "Sideline field pass for one game",
      "Name on the wall",
      "Annual dinner with the head coach",
    ],
  },
  {
    id: "leadership",
    label: "Leadership",
    amountDollars: 10_000,
    rewards: [
      "Season tickets",
      "One field pass",
      "Team-travel invitation",
      "Recognition at the spring game",
    ],
  },
  {
    id: "captain",
    label: "Captain",
    amountDollars: 5_000,
    rewards: ["Two season tickets", "Locker-room tour", "Private pre-game reception"],
  },
  {
    id: "varsity",
    label: "Varsity",
    amountDollars: 2_500,
    rewards: ["Two season tickets", "Invitation to the annual donor reception"],
  },
  {
    id: "letterwinner",
    label: "Letterwinner",
    amountDollars: 1_000,
    rewards: ["Programme gift", "Listing in the game programme", "Priority ticket access"],
  },
] as const;

export const LETTERMAN_JACKET = {
  donateDollars: 200,
  selfDollars: 240,
} as const;

export const TAILGATE_SPONSORSHIP = {
  amountDollars: [250, 500, 1000, 5000] as const,
  games: [
    "vs. Holy Cross",
    "vs. Colgate",
    "vs. Fordham",
    "vs. Lehigh",
    "vs. Lafayette",
    "vs. Bucknell",
    "Homecoming",
    "Spring Game",
    "Other / custom",
  ] as const,
} as const;

export const GIVING_PIECES = [
  {
    id: "one_time",
    label: "One-time",
    href: "/giving/one-time",
    summary: "One-time gift — $250 / $500 / $750.",
  },
  {
    id: "letterman_jacket",
    label: "Letterman",
    href: "/giving/letterman",
    summary: `Donate $${LETTERMAN_JACKET.donateDollars} for a player, or $${LETTERMAN_JACKET.selfDollars} for yourself (suit size).`,
  },
  {
    id: "tailgate",
    label: "Tailgate",
    href: "/giving/tailgate",
    summary: "Sponsor a game — $250 / $500 / $1,000 / $5,000.",
  },
] as const;

export const GIVING_NAV = [
  ...GIVING_PIECES,
  {
    id: "leaderboard",
    label: "Leaderboard",
    href: "/giving/leaderboard",
    summary: "Gift bands, benefit ladder, and live leaders.",
  },
] as const;

export type GivingDesignationId = (typeof GIVING_PIECES)[number]["id"];
export type LettermanJacketVariant = "donate" | "self" | "player_sponsor";

/** Legacy designation ids still readable from older pledges. */
const LEGACY_DESIGNATION_MAP: Record<string, GivingDesignationId> = {
  subscription: "one_time",
  general: "one_time",
  coaches_fund: "one_time",
  player_scholarship: "one_time",
  facilities: "one_time",
  recurring: "one_time",
  one_time: "one_time",
  letterman_jacket: "letterman_jacket",
  tailgate: "tailgate",
};

export function normalizeGivingPiece(value: unknown): GivingDesignationId {
  if (typeof value !== "string") return "one_time";
  const key = value.trim();
  return LEGACY_DESIGNATION_MAP[key] ?? "one_time";
}

export function designationLabel(id: string | null | undefined) {
  const piece = normalizeGivingPiece(id);
  return GIVING_PIECES.find((row) => row.id === piece)?.label ?? "One-time";
}

export function giftBandForDollars(amountDollars: number) {
  return GIFT_BANDS.find((row) => row.amountDollars === amountDollars) ?? null;
}

export function givingPieceById(id: GivingDesignationId) {
  return GIVING_PIECES.find((row) => row.id === id)!;
}

/** Back-compat aliases. */
export const RECURRING_AMOUNTS = ONE_TIME_AMOUNTS.map((row) => ({
  id: row.id,
  label: `$${row.amountDollars}`,
  amountDollars: row.amountDollars,
}));
export const RECURRING_AMOUNT_DOLLARS = ONE_TIME_AMOUNT_DOLLARS;
export const GIVING_DESIGNATIONS = GIVING_PIECES;
export const SUBSCRIPTION_RANKS = GIFT_BANDS.map((row) => ({
  ...row,
  period: "gift" as const,
  approxMonthly: 0,
}));
export const SUBSCRIPTION_AMOUNT_DOLLARS = ONE_TIME_AMOUNT_DOLLARS;
export const subscriptionRankForDollars = giftBandForDollars;
export const recurringLabelForDollars = (amountDollars: number) =>
  giftBandForDollars(amountDollars)?.label ?? null;
