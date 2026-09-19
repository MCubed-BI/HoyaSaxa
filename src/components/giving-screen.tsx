"use client";

import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/query-state";
import { Kpi, KpiGrid } from "@/components/kpi";
import { pillClass } from "@/components/page-chrome";
import { LoadedStamp, Timestamp } from "@/components/timestamp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCount, formatCurrencyDollars, formatNumber } from "@/lib/format";
import {
  IMPACT_AMOUNT_DOLLARS,
  formatPledgeDollars,
  type GivingPledge,
  type GivingSummary,
} from "@/lib/giving";

type Tab = "impact" | "funds" | "leaderboards";

const TABS: { id: Tab; label: string }[] = [
  { id: "impact", label: "Impact" },
  { id: "funds", label: "Funds" },
  { id: "leaderboards", label: "Leaderboards" },
];

export function GivingScreen({
  initial,
  recorded,
  amountError,
  loadedAt,
}: {
  initial: GivingSummary;
  recorded?: boolean;
  amountError?: boolean;
  loadedAt?: string;
}) {
  const [tab, setTab] = useState<Tab>("impact");
  const [amountDollars, setAmountDollars] = useState("25");
  const [donorLabel, setDonorLabel] = useState("");
  const [summary, setSummary] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    amountError ? "Choose a valid impact amount of at least $1." : null,
  );
  const [notice, setNotice] = useState<string | null>(recorded ? "Recorded unpaid intent." : null);

  async function onGiveNow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/giving/pledges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountDollars, donorLabel }),
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
          ? `Recorded ${formatPledgeDollars(payload.pledge.amount_cents)} unpaid intent.`
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
      <KpiGrid>
        <Kpi
          tone="primary"
          icon="giving"
          label="Recorded"
          value={formatPledgeDollars(summary.totals.amount_cents)}
          hint={formatCount(summary.totals.count, "intent")}
        />
        <Kpi
          tone="secondary"
          icon="dollar"
          label="Leaders"
          value={formatNumber(summary.leaders.length)}
          hint="Class and position boards come later"
        />
        <Kpi
          tone="secondary"
          icon="profile"
          label="Recent"
          value={formatNumber(summary.pledges.length)}
          hint="Unpaid intents in Neon"
        />
      </KpiGrid>
      {loadedAt ? <LoadedStamp value={loadedAt} /> : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Giving sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={pillClass(tab === item.id)}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "impact" ? (
        <Card>
          <CardHeader>
            <CardTitle>Choose impact</CardTitle>
          </CardHeader>
          <CardContent>
            <form method="post" action="/api/giving/pledges" onSubmit={onGiveNow} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {IMPACT_AMOUNT_DOLLARS.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant={amountDollars === String(amount) ? "default" : "outline"}
                    aria-pressed={amountDollars === String(amount)}
                    onClick={() => setAmountDollars(String(amount))}
                  >
                    {formatCurrencyDollars(amount)}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={!IMPACT_AMOUNT_DOLLARS.map(String).includes(amountDollars) ? "default" : "outline"}
                  aria-pressed={!IMPACT_AMOUNT_DOLLARS.map(String).includes(amountDollars)}
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
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Placeholder fund list for the MVP shell.</p>
            <p>Hoya Football Fund</p>
            <p>Student-athlete support</p>
            <p>Recruiting visits</p>
          </CardContent>
        </Card>
      ) : null}

      {tab === "leaderboards" ? (
        summary.leaders.length === 0 ? (
          <EmptyState
            title="No pledges yet"
            body="Class and position boards come later. Record an unpaid intent on Impact to start the list."
            icon="giving"
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Leaderboards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {formatCount(summary.totals.count, "intent")} · {formatPledgeDollars(summary.totals.amount_cents)} recorded
              </p>
              <ul className="space-y-2">
                {summary.leaders.map((row) => (
                  <li key={row.donor_label} className="flex justify-between gap-3 border-b py-2 last:border-0">
                    <span className="font-medium text-navy">{row.donor_label}</span>
                    <span className="text-muted-foreground">
                      {formatPledgeDollars(row.amount_cents)} · {formatCount(row.pledge_count, "pledge")}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      ) : null}

      {tab === "impact" && summary.pledges.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent intents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {summary.pledges.map((pledge) => (
              <div key={pledge.id} className="flex justify-between gap-3 border-b py-2 last:border-0">
                <span className="font-medium text-navy">{pledge.donor_label || "Anonymous"}</span>
                <span className="text-muted-foreground">
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
