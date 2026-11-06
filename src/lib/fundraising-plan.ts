/**
 * Fundraising plan terms and rewards (from Fundraising plan.pdf).
 * Tier dollars stay on the Giving / plan glossary surfaces — badge UI never
 * shows donor $ amounts (see docs/CODERS.md).
 */

export const FUNDRAISING_PLAN_PDF_HREF = "/docs/fundraising-plan.pdf";
export const FUNDRAISING_PLAN_PAGE_HREF = "/giving/plan";

/** Campaign pillars — “pick a cause.” */
export const CAMPAIGN_PILLARS = [
  {
    id: "coaches_fund",
    label: "Coaches Fund",
    summary: "Retain and expand the coaching staff — the fastest-growing designation since FY2021.",
  },
  {
    id: "player_scholarship",
    label: "Player Scholarship Fund",
    summary: "Named and pooled scholarships, including the Gridiron Scholarship.",
  },
  {
    id: "facilities",
    label: "Facilities & Locker Room",
    summary: "A visible, finite capital goal that feels new to donors.",
  },
] as const;

/** Annual benefit ladder — “pick a rung.” Independent of campaign pillar. */
export const BENEFIT_LADDER = [
  {
    id: "founders",
    label: "Founders",
    amountDollars: 25_000,
    period: "yr",
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
    period: "yr",
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
    period: "yr",
    rewards: ["Two season tickets", "Locker-room tour", "Private pre-game reception"],
  },
  {
    id: "varsity",
    label: "Varsity",
    amountDollars: 2_500,
    period: "yr",
    rewards: ["Two season tickets", "Invitation to the annual donor reception"],
  },
  {
    id: "letterwinner",
    label: "Letterwinner",
    amountDollars: 1_000,
    period: "yr",
    rewards: ["Programme gift", "Listing in the game programme", "Priority ticket access"],
  },
] as const;

/**
 * Subscription ranking for the broader base (“Everyone else goes on a subscription”).
 * Matches Bronze / Silver / Gold ask bands in the plan.
 */
export const SUBSCRIPTION_RANKS = [
  {
    id: "bronze",
    label: "Bronze",
    amountDollars: 250,
    period: "yr",
    approxMonthly: 21,
    summary: "Entry subscription band — recurring annual support.",
  },
  {
    id: "silver",
    label: "Silver",
    amountDollars: 500,
    period: "yr",
    approxMonthly: 42,
    summary: "Mid subscription band — blended plan average.",
  },
  {
    id: "gold",
    label: "Gold",
    amountDollars: 750,
    period: "yr",
    approxMonthly: 63,
    summary: "Top subscription band below the benefit ladder.",
  },
] as const;

export const SUBSCRIPTION_AMOUNT_DOLLARS = SUBSCRIPTION_RANKS.map((rank) => rank.amountDollars);

export const LETTERMAN_JACKET = {
  playerSponsorDollars: 200,
  selfDollars: 240,
  suitSizes: ["36", "38", "40", "42", "44", "46", "48", "50", "52", "XS", "S", "M", "L", "XL", "2XL", "3XL"] as const,
} as const;

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

export const GIVING_DESIGNATIONS = [
  {
    id: "subscription",
    label: "Annual subscription",
    summary: "Bronze / Silver / Gold recurring ranks from the fundraising plan.",
  },
  {
    id: "coaches_fund",
    label: "Coaches Fund",
    summary: CAMPAIGN_PILLARS[0].summary,
  },
  {
    id: "player_scholarship",
    label: "Player Scholarship Fund",
    summary: CAMPAIGN_PILLARS[1].summary,
  },
  {
    id: "facilities",
    label: "Facilities & Locker Room",
    summary: CAMPAIGN_PILLARS[2].summary,
  },
  {
    id: "letterman_jacket",
    label: "Letterman Jacket",
    summary: `Player sponsor $${LETTERMAN_JACKET.playerSponsorDollars}, or $${LETTERMAN_JACKET.selfDollars} for yourself (suit size required).`,
  },
  {
    id: "tailgate",
    label: "Tailgate sponsorship",
    summary: "Sponsor a game or theme at $250 / $500 / $1,000 / $5,000.",
  },
  {
    id: "general",
    label: "General impact",
    summary: "Flexible gift to Hoya Football.",
  },
] as const;

export type GivingDesignationId = (typeof GIVING_DESIGNATIONS)[number]["id"];
export type LettermanJacketVariant = "player_sponsor" | "self";

export function designationLabel(id: string | null | undefined) {
  return GIVING_DESIGNATIONS.find((row) => row.id === id)?.label ?? "General impact";
}

export function subscriptionRankForDollars(amountDollars: number) {
  return SUBSCRIPTION_RANKS.find((rank) => rank.amountDollars === amountDollars) ?? null;
}
