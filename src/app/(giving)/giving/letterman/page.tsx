import { GivingChrome } from "@/components/giving-chrome";
import { LettermanGivingForm } from "@/components/giving-forms";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { LETTERMAN_JACKET } from "@/lib/fundraising-plan";
import { loadGivingPageContext } from "@/lib/giving-page";

export const metadata = {
  title: "Letterman jacket",
};

export const dynamic = "force-dynamic";

export default async function LettermanGivingPage({
  searchParams,
}: {
  searchParams: Promise<{ recorded?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { locker, summary, errorMessage, alumDonorLabel } = await loadGivingPageContext();

  return (
    <GivingChrome locker={locker}>
      <PageMain width="narrow">
        <PageHeader
          title="Letterman"
          description={`Donate $${LETTERMAN_JACKET.donateDollars} for a player, or $${LETTERMAN_JACKET.selfDollars} for yourself with suit size.`}
        />
        {errorMessage ? (
          <StatusCard title="Giving unavailable" body={errorMessage} />
        ) : (
          <LettermanGivingForm
            initial={summary}
            recorded={params.recorded === "1"}
            amountError={params.error === "amount"}
            defaultDonorLabel={alumDonorLabel}
          />
        )}
      </PageMain>
    </GivingChrome>
  );
}
