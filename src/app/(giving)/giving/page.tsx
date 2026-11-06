import { GivingChrome } from "@/components/giving-chrome";
import { GivingHub } from "@/components/giving-forms";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { loadGivingPageContext } from "@/lib/giving-page";

export const metadata = {
  title: "Give",
};

export const dynamic = "force-dynamic";

export default async function GivingPage() {
  const { locker, summary, errorMessage } = await loadGivingPageContext();

  return (
    <GivingChrome locker={locker}>
      <PageMain width="narrow">
        <PageHeader
          title="Give"
          description="Pick a donation page: Recurring, Letterman, or Tailgate."
        />
        {errorMessage ? (
          <StatusCard title="Giving unavailable" body={errorMessage} />
        ) : (
          <GivingHub initial={summary} />
        )}
      </PageMain>
    </GivingChrome>
  );
}
