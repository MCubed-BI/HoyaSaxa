import { GivingChrome } from "@/components/giving-chrome";
import { OneTimeGivingForm } from "@/components/giving-forms";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { loadGivingPageContext } from "@/lib/giving-page";

export const metadata = {
  title: "One-time gift",
};

export const dynamic = "force-dynamic";

export default async function OneTimeGivingPage({
  searchParams,
}: {
  searchParams: Promise<{ recorded?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { locker, summary, errorMessage, alumDonorLabel } = await loadGivingPageContext();

  return (
    <GivingChrome locker={locker}>
      <PageMain width="narrow">
        <PageHeader title="One-time" description="Make a one-time gift. No monthly bill." />
        {errorMessage ? (
          <StatusCard title="Giving unavailable" body={errorMessage} />
        ) : (
          <OneTimeGivingForm
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
