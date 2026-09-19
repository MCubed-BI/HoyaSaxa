import { AppHeader } from "@/components/app-header";
import { GivingScreen } from "@/components/giving-screen";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { emptyGivingSummary, listGivingSummary } from "@/lib/giving";

export const metadata = {
  title: "Give",
};

export const dynamic = "force-dynamic";

export default async function GivingPage({
  searchParams,
}: {
  searchParams: Promise<{ recorded?: string; error?: string }>;
}) {
  const params = await searchParams;
  let summary = emptyGivingSummary;
  let errorMessage: string | null = null;

  try {
    summary = await listGivingSummary();
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load pledges.";
  }

  return (
    <PageShell>
      <AppHeader current="giving" />
      <PageMain width="narrow">
        <PageHeader
          eyebrow="Fundraising"
          title="Give"
          description="Choose an impact amount and record an unpaid pledge intent. Stripe is not required for this MVP."
        />
        {errorMessage ? (
          <StatusCard title="Giving unavailable" body={errorMessage} />
        ) : (
          <GivingScreen
            initial={summary}
            recorded={params.recorded === "1"}
            amountError={params.error === "amount"}
          />
        )}
      </PageMain>
    </PageShell>
  );
}
