import Link from "next/link";
import { GivingChrome } from "@/components/giving-chrome";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BENEFIT_LADDER,
  CAMPAIGN_PILLARS,
  FUNDRAISING_PLAN_PDF_HREF,
  LETTERMAN_JACKET,
  SUBSCRIPTION_RANKS,
  TAILGATE_SPONSORSHIP,
} from "@/lib/fundraising-plan";
import { formatCurrency } from "@/lib/format";
import { getLockerViewer } from "@/lib/locker-viewer";
import { canOpenGiving } from "@/lib/roles";
import { getCurrentViewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Fundraising terms & rewards",
};

export const dynamic = "force-dynamic";

export default async function GivingPlanPage() {
  const [viewer, locker] = await Promise.all([getCurrentViewer(), getLockerViewer()]);

  if (!viewer || !canOpenGiving(viewer.role)) {
    redirect("/home/login");
  }

  return (
    <GivingChrome locker={locker}>
      <PageMain width="narrow">
        <PageHeader
          eyebrow="Fundraising"
          title="Terms & rewards"
          description={
            <>
              Definitions from the fundraising plan. Tier and campaign are independent — pick a rung
              and a cause.{" "}
              <a
                href={FUNDRAISING_PLAN_PDF_HREF}
                className="font-medium text-navy underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Open Fundraising plan.pdf
              </a>
            </>
          }
          actions={
            <Link
              href="/giving"
              className="text-sm font-medium text-navy underline-offset-4 hover:underline"
            >
              Back to Give
            </Link>
          }
        />

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Campaign pillars</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Three causes donors can rally around. Goal 1 of the plan targets $346K of the
                increase through this structure.
              </p>
              <ul className="space-y-3">
                {CAMPAIGN_PILLARS.map((pillar) => (
                  <li key={pillar.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <p className="font-medium text-foreground">{pillar.label}</p>
                    <p className="text-muted-foreground">{pillar.summary}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Benefit ladder (annual ranks)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Five rungs give each tier a reason to sit there. Three campaigns × five rungs = fifteen
                distinct asks from one structure. Benefits are illustrative and need Georgetown / NCAA
                compliance review.
              </p>
              <ul className="space-y-4">
                {BENEFIT_LADDER.map((rung) => (
                  <li key={rung.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium text-foreground">{rung.label}</p>
                      <p className="text-muted-foreground">
                        {formatCurrency(rung.amountDollars * 100)}/{rung.period}
                      </p>
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

          <Card>
            <CardHeader>
              <CardTitle>Subscription ranking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                “Everyone else goes on a subscription.” Recurring annual bands for the broader base —
                the ranking system used on Give for subscription asks. Badge chips on leaderboards still
                use lifetime percentile bands (Platinum / Gold / Silver / Bronze), not these dollar
                labels alone.
              </p>
              <ul className="space-y-3">
                {SUBSCRIPTION_RANKS.map((rank) => (
                  <li key={rank.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-foreground">{rank.label}</p>
                      <p className="text-muted-foreground">{rank.summary}</p>
                    </div>
                    <p className="text-muted-foreground">
                      {formatCurrency(rank.amountDollars * 100)}/{rank.period}
                      <span className="block text-xs">≈ ${rank.approxMonthly}/mo</span>
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Letterman Jacket &amp; Tailgate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Letterman Jacket.</span> Player Sponsor{" "}
                {formatCurrency(LETTERMAN_JACKET.playerSponsorDollars * 100)} · For Self{" "}
                {formatCurrency(LETTERMAN_JACKET.selfDollars * 100)} (suit size required).
              </p>
              <p>
                <span className="font-medium text-foreground">Tailgate sponsorship.</span> Defaults{" "}
                {TAILGATE_SPONSORSHIP.amountDollars.map((amount) => `$${amount}`).join(" · ")} with a
                theme or game (Homecoming, Spring Game, rivalry, or custom).
              </p>
            </CardContent>
          </Card>
        </div>
      </PageMain>
    </GivingChrome>
  );
}
