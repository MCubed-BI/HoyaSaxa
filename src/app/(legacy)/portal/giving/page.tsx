import { FundraisingCampaignForm, FundraisingPledgeForm } from "@/components/portal-forms";
import { PortalShell } from "@/components/portal-shell";
import { StatusCard } from "@/components/status-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { listFundraisingCampaigns } from "@/lib/portal-queries";
import { canManageFundraising } from "@/lib/roles";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

const IMPACT = [25, 50, 100, 250];

function dollars(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function PortalGivingPage() {
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
    <PortalShell viewer={viewer} current="giving">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Giving</p>
        <h2 className="font-heading text-3xl text-white">Choose your impact</h2>
        <p className="mt-1 text-sm text-white/65">
          MVP pledge intents in Neon. Stripe is later. Coder 3 can replace amounts and checkout.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {IMPACT.map((amount) => (
          <div key={amount} className="rounded-xl border border-gold/30 bg-[#0d1f3c] px-4 py-5 text-center">
            <p className="font-heading text-2xl text-gold">${amount}</p>
            <p className="text-xs text-white/55">Suggested</p>
          </div>
        ))}
      </div>
      {canManageFundraising(viewer.role) ? (
        <Card>
          <CardHeader>
            <CardTitle>New campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <FundraisingCampaignForm next="/portal/giving" />
          </CardContent>
        </Card>
      ) : null}
      {errorMessage ? (
        <StatusCard title="Fundraising unavailable" body={errorMessage} />
      ) : campaigns.length === 0 ? (
        <StatusCard title="No campaigns yet" body="Staff or board can add a campaign. Give Now records an intent." />
      ) : (
        campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <CardTitle>{campaign.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaign.description ? <p className="text-sm text-muted-foreground">{campaign.description}</p> : null}
              <p className="text-sm">
                {campaign.pledge_count} pledge{campaign.pledge_count === 1 ? "" : "s"}
                {campaign.pledged_cents ? ` · ${dollars(campaign.pledged_cents)} recorded` : ""}
              </p>
              {campaign.donate_url ? (
                <div className="space-y-1">
                  <Button asChild>
                    <a href={campaign.donate_url}>Give Now</a>
                  </Button>
                  <p className="text-xs text-muted-foreground">Placeholder link — Stripe is not connected in this MVP.</p>
                </div>
              ) : null}
              <FundraisingPledgeForm campaignId={campaign.id} defaultName={viewer.label} />
            </CardContent>
          </Card>
        ))
      )}
    </PortalShell>
  );
}
