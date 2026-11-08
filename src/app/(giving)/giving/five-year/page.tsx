import { GivingChrome } from "@/components/giving-chrome";
import { FiveYearGivingForm } from "@/components/giving-forms";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { loadGivingPageContext } from "@/lib/giving-page";

export const metadata = {
  title: "5-year commitment",
};

export const dynamic = "force-dynamic";

export default async function FiveYearGivingPage({
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
          title="5-Year"
          description="Five-year commitment with an annual gift of $25k, $10k, $5k, or $1k."
        />
        {errorMessage ? (
          <StatusCard title="Giving unavailable" body={errorMessage} />
        ) : (
          <FiveYearGivingForm
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
