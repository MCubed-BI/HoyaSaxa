import { GivingChrome } from "@/components/giving-chrome";
import { GivingLeaderboard } from "@/components/giving-forms";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { loadGivingPageContext } from "@/lib/giving-page";

export const metadata = {
  title: "Giving leaderboard",
};

export const dynamic = "force-dynamic";

export default async function GivingLeaderboardPage() {
  const { locker, summary, errorMessage } = await loadGivingPageContext();

  return (
    <GivingChrome locker={locker}>
      <PageMain width="narrow">
        <PageHeader
          title="Leaderboard"
          description="Gift bands, benefit ladder rewards, and live leaders."
        />
        {errorMessage ? (
          <StatusCard title="Giving unavailable" body={errorMessage} />
        ) : (
          <GivingLeaderboard initial={summary} />
        )}
      </PageMain>
    </GivingChrome>
  );
}
