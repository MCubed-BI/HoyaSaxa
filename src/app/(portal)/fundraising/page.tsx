import { FundraisingCampaignForm, FundraisingPledgeForm } from "@/components/portal-forms";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { SiteHeader } from "@/components/site-header";
import { EmptyState, ErrorState } from "@/components/query-state";
import { Kpi, KpiGrid } from "@/components/kpi";
import { LoadedStamp } from "@/components/timestamp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { listFundraisingCampaigns } from "@/lib/portal-queries";
import { canManageFundraising } from "@/lib/roles";
import { formatCount, formatCurrency, formatNumber } from "@/lib/format";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

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
    <PageShell>
      <SiteHeader current="fundraising" />
      <PageMain width="narrow">
        <PageHeader
          eyebrow="Give"
          title="Fundraising"
          description="MVP campaigns and pledge intents in Neon. Stripe checkout is later and optional. Mailto and external links are labeled placeholders."
        />

        <LoadedStamp />
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
          <ErrorState title="Fundraising unavailable" body={errorMessage} />
        ) : campaigns.length === 0 ? (
          <EmptyState title="No campaigns yet" body="Staff can add a campaign. Alumni will pledge intents here." icon="giving" />
        ) : (
          <div className="space-y-4">
            <KpiGrid>
              <Kpi tone="primary" icon="giving" label="Campaigns" value={formatNumber(campaigns.length)} />
              <Kpi
                tone="secondary"
                icon="dollar"
                label="Pledged"
                value={formatCurrency(campaigns.reduce((sum, campaign) => sum + (campaign.pledged_cents ?? 0), 0))}
              />
              <Kpi
                tone="secondary"
                icon="profile"
                label="Intents"
                value={formatNumber(campaigns.reduce((sum, campaign) => sum + campaign.pledge_count, 0))}
              />
            </KpiGrid>
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
                    {formatCount(campaign.pledge_count, "pledge")}
                    {campaign.pledged_cents ? ` · ${formatCurrency(campaign.pledged_cents)} recorded` : ""}
                    {campaign.goal_cents ? ` · goal ${formatCurrency(campaign.goal_cents)}` : ""}
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
      </PageMain>
    </PageShell>
  );
}
