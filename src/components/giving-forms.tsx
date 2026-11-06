"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timestamp } from "@/components/timestamp";
import { HoyaBadgeRow } from "@/components/hoya-badges";
import { formatNumber } from "@/lib/format";
import {
  GIVING_PIECES,
  LETTERMAN_JACKET,
  RECURRING_AMOUNTS,
  TAILGATE_SPONSORSHIP,
  givingPieceById,
  type GivingDesignationId,
} from "@/lib/fundraising-plan";
import {
  formatPledgeDollars,
  formatPledgePurpose,
  type GivingPledge,
  type GivingSummary,
} from "@/lib/giving";

type LettermanOption = "donate" | "self";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

function GivingNav({ current }: { current: GivingDesignationId }) {
  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Donation pages">
      <Link href="/giving" className="text-muted-foreground underline-offset-4 hover:underline">
        All options
      </Link>
      {GIVING_PIECES.map((piece) => (
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

function RecentIntents({ summary }: { summary: GivingSummary }) {
  if (summary.pledges.length === 0) return null;
  return (
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
  );
}

function Leaders({ summary }: { summary: GivingSummary }) {
  if (summary.leaders.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboards</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          {formatNumber(summary.totals.count)} intent{summary.totals.count === 1 ? "" : "s"} ·{" "}
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
      <div className="grid gap-3 sm:grid-cols-3">
        {GIVING_PIECES.map((piece) => (
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
      <RecentIntents summary={initial} />
      <Leaders summary={initial} />
    </div>
  );
}

export function RecurringGivingForm({
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
  const [amountDollars, setAmountDollars] = useState(String(RECURRING_AMOUNTS[0].amountDollars));
  const form = usePledgeForm({
    designation: "recurring",
    defaultDonorLabel,
    recorded,
    amountError,
    initial,
    buildBody: () => ({ amountDollars }),
  });
  const piece = givingPieceById("recurring");

  return (
    <div className="space-y-5">
      <GivingNav current="recurring" />
      <Card>
        <CardHeader>
          <CardTitle>{piece.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.onSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">{piece.summary}</p>
            <div className="flex flex-wrap gap-2">
              {RECURRING_AMOUNTS.map((row) => (
                <Button
                  key={row.id}
                  type="button"
                  variant={amountDollars === String(row.amountDollars) ? "default" : "outline"}
                  aria-pressed={amountDollars === String(row.amountDollars)}
                  onClick={() => setAmountDollars(String(row.amountDollars))}
                >
                  {row.label} · ${row.amountDollars}
                </Button>
              ))}
              <Button
                type="button"
                variant={
                  !RECURRING_AMOUNTS.some((row) => String(row.amountDollars) === amountDollars)
                    ? "default"
                    : "outline"
                }
                aria-pressed={
                  !RECURRING_AMOUNTS.some((row) => String(row.amountDollars) === amountDollars)
                }
                onClick={() => setAmountDollars("")}
              >
                Other
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount-dollars">Amount (USD / year)</Label>
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
      <RecentIntents summary={form.summary} />
      <Leaders summary={form.summary} />
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
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Letterman options">
              <Button
                type="button"
                role="tab"
                aria-selected={lettermanOption === "donate"}
                variant={lettermanOption === "donate" ? "default" : "outline"}
                onClick={() => setLettermanOption("donate")}
              >
                Donate · ${LETTERMAN_JACKET.donateDollars}
              </Button>
              <Button
                type="button"
                role="tab"
                aria-selected={lettermanOption === "self"}
                variant={lettermanOption === "self" ? "default" : "outline"}
                onClick={() => setLettermanOption("self")}
              >
                For Self · ${LETTERMAN_JACKET.selfDollars}
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
                Sponsors a player letterman jacket — no suit size needed.
              </p>
            )}
            <DonorFields form={form} />
          </form>
        </CardContent>
      </Card>
      <RecentIntents summary={form.summary} />
      <Leaders summary={form.summary} />
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
  const [tailgateGame, setTailgateGame] = useState<string>(TAILGATE_SPONSORSHIP.games[0]);
  const [customGame, setCustomGame] = useState("");
  const [amountDollars, setAmountDollars] = useState(String(TAILGATE_SPONSORSHIP.amountDollars[0]));
  const isCustomGame = tailgateGame === "Other / custom";
  const resolvedGame = isCustomGame ? customGame : tailgateGame;

  const form = usePledgeForm({
    designation: "tailgate",
    defaultDonorLabel,
    recorded,
    amountError,
    initial,
    buildBody: () => ({
      amountDollars,
      tailgateGame: resolvedGame,
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

            <div className="flex flex-wrap gap-2">
              {TAILGATE_SPONSORSHIP.amountDollars.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant={amountDollars === String(amount) ? "default" : "outline"}
                  aria-pressed={amountDollars === String(amount)}
                  onClick={() => setAmountDollars(String(amount))}
                >
                  ${amount}
                </Button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tailgate-amount">Amount (USD)</Label>
              <Input
                id="tailgate-amount"
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
      <RecentIntents summary={form.summary} />
      <Leaders summary={form.summary} />
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
