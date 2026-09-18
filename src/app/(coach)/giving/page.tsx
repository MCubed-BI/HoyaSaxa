import { AppHeader } from "@/components/app-header";
import { GivingScreen } from "@/components/giving-screen";
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
    <div className="flex min-h-full flex-col">
      <AppHeader current="giving" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Fundraising</p>
          <h2 className="font-heading text-3xl text-navy">Give</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose an impact amount and record an unpaid pledge intent. Stripe is not required for this MVP.
          </p>
        </div>
        {errorMessage ? (
          <StatusCard title="Giving unavailable" body={errorMessage} />
        ) : (
          <GivingScreen
            initial={summary}
            recorded={params.recorded === "1"}
            amountError={params.error === "amount"}
          />
        )}
      </main>
    </div>
  );
}
