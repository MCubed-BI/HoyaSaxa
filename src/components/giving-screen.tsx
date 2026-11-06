"use client";

import { useEffect, useState, type FormEvent } from "react";
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
  type GivingDesignationId,
} from "@/lib/fundraising-plan";
import {
  formatPledgeDollars,
  formatPledgePurpose,
  type GivingPledge,
  type GivingSummary,
} from "@/lib/giving";

type LettermanOption = "donate" | "self";
type TailgateMode = "game" | "theme";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

const TAILGATE_GAMES = [
  "vs. Holy Cross",
  "vs. Colgate",
  "vs. Fordham",
  "vs. Lehigh",
  "vs. Lafayette",
  "vs. Bucknell",
  "Homecoming",
  "Spring Game",
  "Other / custom",
] as const;

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
  const [piece, setPiece] = useState<GivingDesignationId>("recurring");
  const [amountDollars, setAmountDollars] = useState(String(RECURRING_AMOUNTS[0].amountDollars));
  const [lettermanOption, setLettermanOption] = useState<LettermanOption>("donate");
  const [suitSize, setSuitSize] = useState<string>(LETTERMAN_JACKET.suitSizes[4]);
  const [tailgateMode, setTailgateMode] = useState<TailgateMode>("game");
  const [tailgateGame, setTailgateGame] = useState<string>(TAILGATE_GAMES[0]);
  const [customGame, setCustomGame] = useState("");
  const [tailgateTheme, setTailgateTheme] = useState<string>(TAILGATE_SPONSORSHIP.themes[0]);
  const [customTheme, setCustomTheme] = useState("");
  const [donorLabel, setDonorLabel] = useState(defaultDonorLabel ?? "");
  const [summary, setSummary] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    amountError ? "Choose a valid amount of at least $1." : null,
  );
  const [notice, setNotice] = useState<string | null>(recorded ? "Recorded unpaid intent." : null);

  const isCustomGame = tailgateGame === "Other / custom";
  const isCustomTheme = tailgateTheme === "Other / custom";
  const resolvedGame = isCustomGame ? customGame : tailgateGame;
  const resolvedTheme = isCustomTheme ? customTheme : tailgateTheme;

  useEffect(() => {
    if (piece === "letterman_jacket") {
      setAmountDollars(
        String(
          lettermanOption === "self"
            ? LETTERMAN_JACKET.selfDollars
            : LETTERMAN_JACKET.donateDollars,
        ),
      );
      return;
    }
    if (piece === "tailgate") {
      if (!TAILGATE_SPONSORSHIP.amountDollars.map(String).includes(amountDollars)) {
        setAmountDollars(String(TAILGATE_SPONSORSHIP.amountDollars[0]));
      }
      return;
    }
    if (!RECURRING_AMOUNTS.some((row) => String(row.amountDollars) === amountDollars)) {
      setAmountDollars(String(RECURRING_AMOUNTS[0].amountDollars));
    }
  }, [piece, lettermanOption]); // eslint-disable-line react-hooks/exhaustive-deps -- reset presets only when piece/option changes

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
          designation: piece,
          jacketVariant: piece === "letterman_jacket" ? lettermanOption : undefined,
          suitSize: piece === "letterman_jacket" && lettermanOption === "self" ? suitSize : undefined,
          tailgateMode: piece === "tailgate" ? tailgateMode : undefined,
          tailgateGame: piece === "tailgate" && tailgateMode === "game" ? resolvedGame : undefined,
          tailgateTheme: piece === "tailgate" && tailgateMode === "theme" ? resolvedTheme : undefined,
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
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Giving options">
        {GIVING_PIECES.map((item) => (
          <Button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={piece === item.id}
            variant={piece === item.id ? "default" : "outline"}
            onClick={() => setPiece(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{GIVING_PIECES.find((row) => row.id === piece)?.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="post" action="/api/giving/pledges" onSubmit={onGiveNow} className="space-y-4">
            <input type="hidden" name="designation" value={piece} />
            <p className="text-sm text-muted-foreground">
              {GIVING_PIECES.find((row) => row.id === piece)?.summary}
            </p>

            {piece === "recurring" ? (
              <div className="space-y-3">
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
              </div>
            ) : null}

            {piece === "letterman_jacket" ? (
              <div className="space-y-3">
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
                <input type="hidden" name="jacketVariant" value={lettermanOption} />
                <input type="hidden" name="amountDollars" value={amountDollars} />
                {lettermanOption === "self" ? (
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
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sponsors a player letterman jacket — no suit size needed.
                  </p>
                )}
              </div>
            ) : null}

            {piece === "tailgate" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tailgate type">
                  <Button
                    type="button"
                    role="tab"
                    aria-selected={tailgateMode === "game"}
                    variant={tailgateMode === "game" ? "default" : "outline"}
                    onClick={() => setTailgateMode("game")}
                  >
                    Game
                  </Button>
                  <Button
                    type="button"
                    role="tab"
                    aria-selected={tailgateMode === "theme"}
                    variant={tailgateMode === "theme" ? "default" : "outline"}
                    onClick={() => setTailgateMode("theme")}
                  >
                    Theme
                  </Button>
                </div>
                <input type="hidden" name="tailgateMode" value={tailgateMode} />

                {tailgateMode === "game" ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="tailgate-game">Game</Label>
                      <select
                        id="tailgate-game"
                        className={SELECT_CLASS}
                        value={tailgateGame}
                        onChange={(event) => setTailgateGame(event.target.value)}
                      >
                        {TAILGATE_GAMES.map((game) => (
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
                    ) : (
                      <input type="hidden" name="tailgateGame" value={tailgateGame} />
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="tailgate-theme">Theme</Label>
                      <select
                        id="tailgate-theme"
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
                  </div>
                )}

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
              </div>
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

      {summary.pledges.length > 0 ? (
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

      {summary.leaders.length > 0 ? (
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
      ) : null}
    </div>
  );
}
