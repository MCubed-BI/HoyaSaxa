"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timestamp } from "@/components/timestamp";
import { formatNumber } from "@/lib/format";
import { HoyaBadgeRow } from "@/components/hoya-badges";
import {
  CAMPAIGN_PILLARS,
  FUNDRAISING_PLAN_PAGE_HREF,
  GIVING_DESIGNATIONS,
  LETTERMAN_JACKET,
  SUBSCRIPTION_AMOUNT_DOLLARS,
  SUBSCRIPTION_RANKS,
  TAILGATE_SPONSORSHIP,
  type GivingDesignationId,
  type LettermanJacketVariant,
} from "@/lib/fundraising-plan";
import {
  IMPACT_AMOUNT_DOLLARS,
  formatPledgeDollars,
  formatPledgePurpose,
  type GivingPledge,
  type GivingSummary,
} from "@/lib/giving";

type Tab = "impact" | "funds" | "leaderboards";

const TABS: { id: Tab; label: string }[] = [
  { id: "impact", label: "Impact" },
  { id: "funds", label: "Funds" },
  { id: "leaderboards", label: "Leaderboards" },
];

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

function presetAmountsFor(designation: GivingDesignationId): readonly number[] {
  if (designation === "subscription" || designation === "coaches_fund" || designation === "player_scholarship" || designation === "facilities") {
    return SUBSCRIPTION_AMOUNT_DOLLARS;
  }
  if (designation === "tailgate") return TAILGATE_SPONSORSHIP.amountDollars;
  if (designation === "letterman_jacket") return [];
  return IMPACT_AMOUNT_DOLLARS;
}

export function GivingScreen({
  initial,
  recorded,
  amountError,
  defaultDonorLabel,
}: {
  initial: GivingSummary;
  recorded?: boolean;
  amountError?: boolean;
  defaultDonorLabel?: string;
}) {
  const [tab, setTab] = useState<Tab>("impact");
  const [designation, setDesignation] = useState<GivingDesignationId>("subscription");
  const [amountDollars, setAmountDollars] = useState(String(SUBSCRIPTION_AMOUNT_DOLLARS[0]));
  const [jacketVariant, setJacketVariant] = useState<LettermanJacketVariant>("player_sponsor");
  const [suitSize, setSuitSize] = useState<string>(LETTERMAN_JACKET.suitSizes[4]);
  const [tailgateTheme, setTailgateTheme] = useState<string>(TAILGATE_SPONSORSHIP.themes[0]);
  const [tailgateGame, setTailgateGame] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [donorLabel, setDonorLabel] = useState(defaultDonorLabel ?? "");
  const [summary, setSummary] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    amountError ? "Choose a valid impact amount of at least $1." : null,
  );
  const [notice, setNotice] = useState<string | null>(recorded ? "Recorded unpaid intent." : null);

  const presets = presetAmountsFor(designation);
  const isCustomTheme = tailgateTheme === "Other / custom";
  const resolvedTheme = isCustomTheme ? customTheme : tailgateTheme;

  useEffect(() => {
    if (designation === "letterman_jacket") {
      setAmountDollars(
        String(
          jacketVariant === "self"
            ? LETTERMAN_JACKET.selfDollars
            : LETTERMAN_JACKET.playerSponsorDollars,
        ),
      );
      return;
    }
    const nextPresets = presetAmountsFor(designation);
    if (nextPresets.length > 0 && !nextPresets.map(String).includes(amountDollars)) {
      setAmountDollars(String(nextPresets[0]));
    }
  }, [designation, jacketVariant]); // eslint-disable-line react-hooks/exhaustive-deps -- only reset when purpose/variant changes

  async function onGiveNow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/giving/pledges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountDollars,
          donorLabel,
          designation,
          jacketVariant: designation === "letterman_jacket" ? jacketVariant : undefined,
          suitSize: designation === "letterman_jacket" && jacketVariant === "self" ? suitSize : undefined,
          tailgateTheme: designation === "tailgate" ? resolvedTheme : undefined,
          tailgateGame: designation === "tailgate" ? tailgateGame : undefined,
        }),
      });
      const payload = (await response.json()) as GivingSummary & {
        pledge?: GivingPledge;
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error || "Could not save that pledge.");
        return;
      }
      setSummary(payload);
      setNotice(
        payload.pledge
          ? `Recorded ${formatPledgeDollars(payload.pledge.amount_cents)} unpaid intent · ${formatPledgePurpose(payload.pledge)}.`
          : "Recorded unpaid intent.",
      );
    } catch {
      setError("Could not save that pledge.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Choose where your gift goes.{" "}
        <Link href={FUNDRAISING_PLAN_PAGE_HREF} className="font-medium text-navy underline-offset-4 hover:underline">
          See each term and reward
        </Link>{" "}
        from the fundraising plan (ladder ranks, subscription Bronze/Silver/Gold, and campaign pillars).
      </p>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Giving sections">
        {TABS.map((item) => (
          <Button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            variant={tab === item.id ? "default" : "outline"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {tab === "impact" ? (
        <Card>
          <CardHeader>
            <CardTitle>Choose impact</CardTitle>
          </CardHeader>
          <CardContent>
            <form method="post" action="/api/giving/pledges" onSubmit={onGiveNow} className="space-y-4">
              <input type="hidden" name="designation" value={designation} />
              <div className="space-y-1.5">
                <Label htmlFor="designation">Donate for</Label>
                <select
                  id="designation"
                  className={SELECT_CLASS}
                  value={designation}
                  onChange={(event) => setDesignation(event.target.value as GivingDesignationId)}
                >
                  {GIVING_DESIGNATIONS.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {GIVING_DESIGNATIONS.find((row) => row.id === designation)?.summary}
                </p>
              </div>

              {designation === "letterman_jacket" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={jacketVariant === "player_sponsor" ? "default" : "outline"}
                      aria-pressed={jacketVariant === "player_sponsor"}
                      onClick={() => setJacketVariant("player_sponsor")}
                    >
                      Player Sponsor · ${LETTERMAN_JACKET.playerSponsorDollars}
                    </Button>
                    <Button
                      type="button"
                      variant={jacketVariant === "self" ? "default" : "outline"}
                      aria-pressed={jacketVariant === "self"}
                      onClick={() => setJacketVariant("self")}
                    >
                      For Self · ${LETTERMAN_JACKET.selfDollars}
                    </Button>
                  </div>
                  <input type="hidden" name="jacketVariant" value={jacketVariant} />
                  <input type="hidden" name="amountDollars" value={amountDollars} />
                  {jacketVariant === "self" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="suit-size">Suit size</Label>
                      <select
                        id="suit-size"
                        name="suitSize"
                        required
                        className={SELECT_CLASS}
                        value={suitSize}
                        onChange={(event) => setSuitSize(event.target.value)}
                      >
                        {LETTERMAN_JACKET.suitSizes.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {designation === "tailgate" ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tailgate-theme">Theme / game</Label>
                    <select
                      id="tailgate-theme"
                      name="tailgateTheme"
                      className={SELECT_CLASS}
                      value={tailgateTheme}
                      onChange={(event) => setTailgateTheme(event.target.value)}
                    >
                      {TAILGATE_SPONSORSHIP.themes.map((theme) => (
                        <option key={theme} value={theme}>
                          {theme}
                        </option>
                      ))}
                    </select>
                  </div>
                  {isCustomTheme ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="custom-theme">Custom theme</Label>
                      <Input
                        id="custom-theme"
                        name="tailgateThemeCustom"
                        maxLength={120}
                        required
                        value={customTheme}
                        onChange={(event) => setCustomTheme(event.target.value)}
                        placeholder="e.g. Family Weekend"
                      />
                    </div>
                  ) : (
                    <input type="hidden" name="tailgateTheme" value={tailgateTheme} />
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="tailgate-game">Game note (optional)</Label>
                    <Input
                      id="tailgate-game"
                      name="tailgateGame"
                      maxLength={120}
                      value={tailgateGame}
                      onChange={(event) => setTailgateGame(event.target.value)}
                      placeholder="e.g. vs. Holy Cross"
                    />
                  </div>
                </div>
              ) : null}

              {designation !== "letterman_jacket" ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((amount) => {
                      const rank =
                        designation === "subscription"
                          ? SUBSCRIPTION_RANKS.find((row) => row.amountDollars === amount)
                          : null;
                      return (
                        <Button
                          key={amount}
                          type="button"
                          variant={amountDollars === String(amount) ? "default" : "outline"}
                          aria-pressed={amountDollars === String(amount)}
                          onClick={() => setAmountDollars(String(amount))}
                        >
                          {rank ? `${rank.label} · $${amount}` : `$${amount}`}
                        </Button>
                      );
                    })}
                    {designation === "general" ||
                    designation === "coaches_fund" ||
                    designation === "player_scholarship" ||
                    designation === "facilities" ? (
                      <Button
                        type="button"
                        variant={!presets.map(String).includes(amountDollars) ? "default" : "outline"}
                        aria-pressed={!presets.map(String).includes(amountDollars)}
                        onClick={() => setAmountDollars("")}
                      >
                        Other
                      </Button>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="amount-dollars">Amount (USD)</Label>
                    <Input
                      id="amount-dollars"
                      name="amountDollars"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={amountDollars}
                      onChange={(event) => setAmountDollars(event.target.value)}
                      readOnly={designation === "tailgate" && presets.map(String).includes(amountDollars)}
                    />
                    {designation === "subscription" ? (
                      <p className="text-xs text-muted-foreground">
                        Subscription ranks follow the plan: Bronze $250 · Silver $500 · Gold $750 / yr.
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="donor-label">Donor label (optional)</Label>
                <Input
                  id="donor-label"
                  name="donorLabel"
                  maxLength={80}
                  value={donorLabel}
                  onChange={(event) => setDonorLabel(event.target.value)}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Give Now"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Saves an unpaid pledge intent in Neon. Stripe checkout is later.
              </p>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {tab === "funds" ? (
        <Card>
          <CardHeader>
            <CardTitle>Funds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Tier and campaign are independent: pick a rung and a cause.{" "}
              <Link href={FUNDRAISING_PLAN_PAGE_HREF} className="font-medium text-navy underline-offset-4 hover:underline">
                Full terms &amp; rewards
              </Link>
            </p>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Campaign pillars</p>
              <ul className="space-y-2 text-muted-foreground">
                {CAMPAIGN_PILLARS.map((pillar) => (
                  <li key={pillar.id}>
                    <button
                      type="button"
                      className="text-left font-medium text-navy underline-offset-4 hover:underline"
                      onClick={() => {
                        setDesignation(pillar.id);
                        setTab("impact");
                      }}
                    >
                      {pillar.label}
                    </button>
                    <span className="block text-xs">{pillar.summary}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Special asks</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <button
                    type="button"
                    className="font-medium text-navy underline-offset-4 hover:underline"
                    onClick={() => {
                      setDesignation("letterman_jacket");
                      setTab("impact");
                    }}
                  >
                    Letterman Jacket
                  </button>
                  {` — $${LETTERMAN_JACKET.playerSponsorDollars} player sponsor · $${LETTERMAN_JACKET.selfDollars} for self`}
                </li>
                <li>
                  <button
                    type="button"
                    className="font-medium text-navy underline-offset-4 hover:underline"
                    onClick={() => {
                      setDesignation("tailgate");
                      setTab("impact");
                    }}
                  >
                    Tailgate sponsorship
                  </button>
                  {" — $250 / $500 / $1,000 / $5,000 with theme or game"}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "leaderboards" ? (
        <Card>
          <CardHeader>
            <CardTitle>Leaderboards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {formatNumber(summary.totals.count)} intent{summary.totals.count === 1 ? "" : "s"} ·{" "}
              {formatPledgeDollars(summary.totals.amount_cents)} recorded
            </p>
            <p className="text-xs text-muted-foreground">
              Donor badge ranks use lifetime pledge totals (Platinum / Gold / Silver / Bronze percentiles) —
              not the subscription ask bands.{" "}
              <Link href={FUNDRAISING_PLAN_PAGE_HREF} className="text-navy underline-offset-4 hover:underline">
                How ranks relate to the plan
              </Link>
            </p>
            {summary.leaders.length === 0 ? (
              <p className="text-muted-foreground">No pledges yet. Class and position boards come later.</p>
            ) : (
              <ul className="space-y-2">
                {summary.leaders.map((row) => (
                  <li key={row.donor_label} className="flex justify-between gap-3 border-b py-2 last:border-0">
                    <div className="min-w-0 space-y-1">
                      <span>{row.donor_label}</span>
                      {row.badge ? <HoyaBadgeRow badges={[row.badge]} /> : null}
                    </div>
                    <span>
                      {formatPledgeDollars(row.amount_cents)} · {row.pledge_count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "impact" && summary.pledges.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent intents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {summary.pledges.map((pledge) => (
              <div key={pledge.id} className="flex justify-between gap-3 border-b py-2 last:border-0">
                <div className="min-w-0">
                  <span>{pledge.donor_label || "Anonymous"}</span>
                  <span className="block text-xs text-muted-foreground">{formatPledgePurpose(pledge)}</span>
                </div>
                <span className="shrink-0 text-right">
                  {formatPledgeDollars(pledge.amount_cents)} · {pledge.status}
                  {pledge.created_at ? (
                    <>
                      {" · "}
                      <Timestamp value={pledge.created_at} />
                    </>
                  ) : null}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
