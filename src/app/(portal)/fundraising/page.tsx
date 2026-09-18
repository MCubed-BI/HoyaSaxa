import { FundraisingCampaignForm, FundraisingPledgeForm } from "@/components/portal-forms";
import { SiteHeader } from "@/components/site-header";
import { StatusCard } from "@/components/status-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { listFundraisingCampaigns } from "@/lib/portal-queries";
import { canManageFundraising } from "@/lib/roles";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

function dollars(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default async function FundraisingPage() {
  const viewer = await requireViewer();
  let campaigns: Awaited<ReturnType<typeof listFundraisingCampaigns>> = [];
  let errorMessage: string | null = null;

  try {
    campaigns = await listFundraisingCampaigns();
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load campaigns.";
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader current="fundraising" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Give</p>
          <h2 className="font-heading text-3xl text-navy">Fundraising</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            MVP campaigns and pledge intents in Neon. Stripe checkout is later and optional. Mailto
            and external links are labeled placeholders.
          </p>
        </div>

        {canManageFundraising(viewer.role) ? (
          <Card>
            <CardHeader>
              <CardTitle>New campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <FundraisingCampaignForm />
            </CardContent>
          </Card>
        ) : null}

        {errorMessage ? (
          <StatusCard title="Fundraising unavailable" body={errorMessage} />
        ) : campaigns.length === 0 ? (
          <StatusCard title="No campaigns yet" body="Staff can add a campaign. Alumni will pledge intents here." />
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <CardTitle>{campaign.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {campaign.description ? (
                    <p className="text-sm text-muted-foreground">{campaign.description}</p>
                  ) : null}
                  <p className="text-sm">
                    {campaign.pledge_count} pledge{campaign.pledge_count === 1 ? "" : "s"}
                    {campaign.pledged_cents ? ` · ${dollars(campaign.pledged_cents)} recorded` : ""}
                    {campaign.goal_cents ? ` · goal ${dollars(campaign.goal_cents)}` : ""}
                  </p>
                  {campaign.donate_url ? (
                    <div className="space-y-1">
                      <Button asChild>
                        <a href={campaign.donate_url}>Donate CTA</a>
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Placeholder link — Stripe is not connected in this MVP.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No donate URL yet. Record a pledge intent below.
                    </p>
                  )}
                  <FundraisingPledgeForm campaignId={campaign.id} defaultName={viewer.label} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
