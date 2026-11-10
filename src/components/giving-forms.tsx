"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timestamp } from "@/components/timestamp";
import { HoyaBadgeRow } from "@/components/hoya-badges";
import {
  BENEFIT_LADDER,
  FIVE_YEAR_AMOUNTS,
  GIFT_BANDS,
  GIVING_NAV,
  LETTERMAN_JACKET,
  ONE_TIME_AMOUNTS,
  TAILGATE_SPONSORSHIP,
  givingPieceById,
  type GivingDesignationId,
  type TailgateMode,
} from "@/lib/fundraising-plan";
import {
  formatPledgeDollars,
  formatPledgePurpose,
  type GivingPledge,
  type GivingSummary,
} from "@/lib/giving";
import { formatCurrency, formatNumber } from "@/lib/format";

type LettermanOption = "donate" | "self";
type GivingNavId = GivingDesignationId | "leaderboard";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

function GivingNav({ current }: { current: GivingNavId }) {
  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Donation pages">
      <Link href="/giving" className="text-muted-foreground underline-offset-4 hover:underline">
        All options
      </Link>
      {GIVING_NAV.map((piece) => (
        <Link
          key={piece.id}
          href={piece.href}
          aria-current={piece.id === current ? "page" : undefined}
          className={
            piece.id === current
              ? "font-medium text-navy"
              : "text-muted-foreground underline-offset-4 hover:underline"
          }
        >
          {piece.label}
        </Link>
      ))}
    </nav>
  );
}

function RecentGifts({ summary }: { summary: GivingSummary }) {
  if (summary.pledges.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent gifts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {summary.pledges.map((pledge) => (
          <div key={pledge.id} className="flex justify-between gap-3 border-b py-2 last:border-0">
            <div className="min-w-0">
              <span>{pledge.donor_label || "Anonymous"}</span>
              <span className="block text-xs text-muted-foreground">{formatPledgePurpose(pledge)}</span>
            </div>
            <span className="shrink-0 text-right">
              {formatPledgeDollars(pledge.amount_cents)}
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
  );
}

function Leaders({ summary }: { summary: GivingSummary }) {
  if (summary.leaders.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          {formatNumber(summary.totals.count)} gift{summary.totals.count === 1 ? "" : "s"} ·{" "}
          {formatPledgeDollars(summary.totals.amount_cents)} recorded
        </p>
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
      </CardContent>
    </Card>
  );
}

function usePledgeForm({
  designation,
  defaultDonorLabel,
  recorded,
  amountError,
  initial,
  buildBody,
}: {
  designation: GivingDesignationId;
  defaultDonorLabel?: string;
  recorded?: boolean;
  amountError?: boolean;
  initial: GivingSummary;
  buildBody: () => Record<string, unknown>;
}) {
  const [donorLabel, setDonorLabel] = useState(defaultDonorLabel ?? "");
  const [summary, setSummary] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    amountError ? "Choose a valid amount of at least $1." : null,
  );
  const [notice, setNotice] = useState<string | null>(recorded ? "Recorded unpaid intent." : null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/giving/pledges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildBody(), donorLabel, designation }),
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

  return {
    donorLabel,
    setDonorLabel,
    summary,
    pending,
    error,
    notice,
    onSubmit,
  };
}

export function GivingHub({ initial }: { initial: GivingSummary }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GIVING_NAV.map((piece) => (
          <Link
            key={piece.id}
            href={piece.href}
            className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-xs)] transition-colors hover:border-navy/40"
          >
            <p className="font-heading text-lg text-navy">{piece.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{piece.summary}</p>
          </Link>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Leaders summary={initial} />
        <RecentGifts summary={initial} />
      </div>
    </div>
  );
}

export function FiveYearGivingForm({
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
  const [amountDollars, setAmountDollars] = useState(String(FIVE_YEAR_AMOUNTS[0].amountDollars));
  const form = usePledgeForm({
    designation: "five_year",
    defaultDonorLabel,
    recorded,
    amountError,
    initial,
    buildBody: () => ({ amountDollars }),
  });
  const piece = givingPieceById("five_year");

  return (
    <div className="space-y-5">
      <GivingNav current="five_year" />
      <Card>
        <CardHeader>
          <CardTitle>{piece.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.onSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">{piece.summary}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Annual commitment amounts">
              {FIVE_YEAR_AMOUNTS.map((row) => (
                <Button
                  key={row.id}
                  type="button"
                  variant={amountDollars === String(row.amountDollars) ? "default" : "outline"}
                  aria-pressed={amountDollars === String(row.amountDollars)}
                  onClick={() => setAmountDollars(String(row.amountDollars))}
                >
                  ${row.amountDollars.toLocaleString("en-US")}/yr
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Records the annual gift amount for a five-year commitment. Stripe checkout is later.
            </p>
            <DonorFields form={form} />
          </form>
        </CardContent>
      </Card>
      <RecentGifts summary={form.summary} />
    </div>
  );
}

export function OneTimeGivingForm({
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
  const [amountDollars, setAmountDollars] = useState(String(ONE_TIME_AMOUNTS[0].amountDollars));
  const form = usePledgeForm({
    designation: "one_time",
    defaultDonorLabel,
    recorded,
    amountError,
    initial,
    buildBody: () => ({ amountDollars }),
  });
  const piece = givingPieceById("one_time");

  return (
    <div className="space-y-5">
      <GivingNav current="one_time" />
      <Card>
        <CardHeader>
          <CardTitle>{piece.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.onSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">{piece.summary}</p>
            <div className="flex flex-wrap gap-2">
              {ONE_TIME_AMOUNTS.map((row) => (
                <Button
                  key={row.id}
                  type="button"
                  variant={amountDollars === String(row.amountDollars) ? "default" : "outline"}
                  aria-pressed={amountDollars === String(row.amountDollars)}
                  onClick={() => setAmountDollars(String(row.amountDollars))}
                >
                  ${row.amountDollars}
                </Button>
              ))}
              <Button
                type="button"
                variant={
                  !ONE_TIME_AMOUNTS.some((row) => String(row.amountDollars) === amountDollars)
                    ? "default"
                    : "outline"
                }
                aria-pressed={
                  !ONE_TIME_AMOUNTS.some((row) => String(row.amountDollars) === amountDollars)
                }
                onClick={() => setAmountDollars("")}
              >
                Other
              </Button>
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
              />
            </div>
            <DonorFields form={form} />
          </form>
        </CardContent>
      </Card>
      <RecentGifts summary={form.summary} />
    </div>
  );
}

/** @deprecated Use OneTimeGivingForm */
export const RecurringGivingForm = OneTimeGivingForm;

export function GivingLeaderboard({ initial }: { initial: GivingSummary }) {
  return (
    <div className="space-y-5">
      <GivingNav current="leaderboard" />

      <Card>
        <CardHeader>
          <CardTitle>Gift bands</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            One-time gift bands used for recognition. These are not a monthly bill.
          </p>
          <ul className="space-y-3">
            {GIFT_BANDS.map((band) => (
              <li
                key={band.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-foreground">{band.label}</p>
                  <p className="text-muted-foreground">{band.summary}</p>
                </div>
                <p className="text-muted-foreground">{formatCurrency(band.amountDollars * 100)}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Benefit ladder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Annual ranks and rewards. Benefits are illustrative and need compliance review.
          </p>
          <ul className="space-y-4">
            {BENEFIT_LADDER.map((rung) => (
              <li key={rung.id} className="border-b pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-foreground">{rung.label}</p>
                  <p className="text-muted-foreground">{formatCurrency(rung.amountDollars * 100)}/yr</p>
                </div>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                  {rung.rewards.map((reward) => (
                    <li key={reward}>{reward}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Leaders summary={initial} />
        <RecentGifts summary={initial} />
      </div>
    </div>
  );
}

export function LettermanGivingForm({
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
  const [lettermanOption, setLettermanOption] = useState<LettermanOption>("donate");
  const [suitSize, setSuitSize] = useState("");
  const amountDollars =
    lettermanOption === "self" ? LETTERMAN_JACKET.selfDollars : LETTERMAN_JACKET.donateDollars;
  const form = usePledgeForm({
    designation: "letterman_jacket",
    defaultDonorLabel,
    recorded,
    amountError,
    initial,
    buildBody: () => ({
      amountDollars,
      jacketVariant: lettermanOption,
      suitSize: lettermanOption === "self" ? suitSize : undefined,
    }),
  });
  const piece = givingPieceById("letterman_jacket");

  return (
    <div className="space-y-5">
      <GivingNav current="letterman_jacket" />
      <Card>
        <CardHeader>
          <CardTitle>{piece.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.onSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">{piece.summary}</p>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Letter jacket options">
              <Button
                type="button"
                role="tab"
                aria-selected={lettermanOption === "donate"}
                variant={lettermanOption === "donate" ? "default" : "outline"}
                onClick={() => setLettermanOption("donate")}
              >
                Sponsor · ${LETTERMAN_JACKET.donateDollars}
              </Button>
              <Button
                type="button"
                role="tab"
                aria-selected={lettermanOption === "self"}
                variant={lettermanOption === "self" ? "default" : "outline"}
                onClick={() => setLettermanOption("self")}
              >
                Purchase · ${LETTERMAN_JACKET.selfDollars}
              </Button>
            </div>
            {lettermanOption === "self" ? (
              <div className="space-y-1.5">
                <Label htmlFor="suit-size">Suit size</Label>
                <Input
                  id="suit-size"
                  name="suitSize"
                  required
                  maxLength={40}
                  value={suitSize}
                  onChange={(event) => setSuitSize(event.target.value)}
                  placeholder="e.g. 42R, XL, 44L"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sponsors a player letter jacket — no suit size needed.
              </p>
            )}
            <DonorFields form={form} />
          </form>
        </CardContent>
      </Card>
      <RecentGifts summary={form.summary} />
    </div>
  );
}

export function TailgateGivingForm({
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
  const [tailgateMode, setTailgateMode] = useState<TailgateMode>("per_game");
  const [tailgateGame, setTailgateGame] = useState<string>(TAILGATE_SPONSORSHIP.games[0]);
  const [customGame, setCustomGame] = useState("");
  const isCustomGame = tailgateGame === "Other / custom";
  const resolvedGame = isCustomGame ? customGame : tailgateGame;
  const amountDollars =
    tailgateMode === "entire_event"
      ? TAILGATE_SPONSORSHIP.entireEventDollars
      : TAILGATE_SPONSORSHIP.perGameDollars;

  const form = usePledgeForm({
    designation: "tailgate",
    defaultDonorLabel,
    recorded,
    amountError,
    initial,
    buildBody: () => ({
      amountDollars,
      tailgateMode,
      tailgateGame: tailgateMode === "per_game" ? resolvedGame : undefined,
    }),
  });
  const piece = givingPieceById("tailgate");

  return (
    <div className="space-y-5">
      <GivingNav current="tailgate" />
      <Card>
        <CardHeader>
          <CardTitle>{piece.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.onSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">{piece.summary}</p>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tailgate options">
              <Button
                type="button"
                role="tab"
                aria-selected={tailgateMode === "per_game"}
                variant={tailgateMode === "per_game" ? "default" : "outline"}
                onClick={() => setTailgateMode("per_game")}
              >
                ${TAILGATE_SPONSORSHIP.perGameDollars} ea
              </Button>
              <Button
                type="button"
                role="tab"
                aria-selected={tailgateMode === "entire_event"}
                variant={tailgateMode === "entire_event" ? "default" : "outline"}
                onClick={() => setTailgateMode("entire_event")}
              >
                ${TAILGATE_SPONSORSHIP.entireEventDollars.toLocaleString("en-US")} Sponsor entire event
              </Button>
            </div>

            {tailgateMode === "per_game" ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tailgate-game">Game</Label>
                  <select
                    id="tailgate-game"
                    className={SELECT_CLASS}
                    value={tailgateGame}
                    onChange={(event) => setTailgateGame(event.target.value)}
                  >
                    {TAILGATE_SPONSORSHIP.games.map((game) => (
                      <option key={game} value={game}>
                        {game}
                      </option>
                    ))}
                  </select>
                </div>
                {isCustomGame ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="custom-game">Custom game</Label>
                    <Input
                      id="custom-game"
                      maxLength={120}
                      required
                      value={customGame}
                      onChange={(event) => setCustomGame(event.target.value)}
                      placeholder="e.g. vs. Georgetown Day"
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sponsors the entire tailgate event for ${TAILGATE_SPONSORSHIP.entireEventDollars.toLocaleString("en-US")}.
              </p>
            )}
            <DonorFields form={form} />
          </form>
        </CardContent>
      </Card>
      <RecentGifts summary={form.summary} />
    </div>
  );
}

function DonorFields({
  form,
}: {
  form: {
    donorLabel: string;
    setDonorLabel: (value: string) => void;
    pending: boolean;
    error: string | null;
    notice: string | null;
  };
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="donor-label">Donor label (optional)</Label>
        <Input
          id="donor-label"
          name="donorLabel"
          maxLength={80}
          value={form.donorLabel}
          onChange={(event) => form.setDonorLabel(event.target.value)}
        />
      </div>
      {form.error ? <p className="text-sm text-destructive">{form.error}</p> : null}
      {form.notice ? <p className="text-sm text-muted-foreground">{form.notice}</p> : null}
      <Button type="submit" disabled={form.pending}>
        {form.pending ? "Saving…" : "Give Now"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Saves an unpaid pledge intent in Neon. Stripe checkout is later.
      </p>
    </>
  );
}
