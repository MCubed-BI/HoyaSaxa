import { redirect } from "next/navigation";
import { GivingChrome } from "@/components/giving-chrome";
import { GivingScreen } from "@/components/giving-screen";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { emptyGivingSummary, listGivingSummary } from "@/lib/giving";
import { getLockerViewer } from "@/lib/locker-viewer";
import { canOpenGiving } from "@/lib/roles";
import { getCurrentViewer } from "@/lib/viewer";

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
  const [viewer, locker] = await Promise.all([getCurrentViewer(), getLockerViewer()]);

  if (!viewer || !canOpenGiving(viewer.role)) {
    redirect("/home/login");
  }

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

  const alumDonorLabel =
    locker && locker.source !== "ga_session" && locker.label ? locker.label : undefined;

  return (
    <GivingChrome locker={locker}>
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
            defaultDonorLabel={alumDonorLabel}
          />
        )}
      </PageMain>
    </GivingChrome>
  );
}
