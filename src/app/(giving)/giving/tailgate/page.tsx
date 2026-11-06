import { GivingChrome } from "@/components/giving-chrome";
import { TailgateGivingForm } from "@/components/giving-forms";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { loadGivingPageContext } from "@/lib/giving-page";

export const metadata = {
  title: "Tailgate sponsorship",
};

export const dynamic = "force-dynamic";

export default async function TailgateGivingPage({
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
          title="Tailgate"
          description="Sponsor a game or a theme at $250 / $500 / $1,000 / $5,000."
        />
        {errorMessage ? (
          <StatusCard title="Giving unavailable" body={errorMessage} />
        ) : (
          <TailgateGivingForm
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
