import { cookies } from "next/headers";
import { AppHeader } from "@/components/app-header";
import { EventsList } from "@/components/events-list";
import { StatusCard } from "@/components/status-card";
import { SESSION_COOKIE } from "@/lib/auth";
import { getEventActorFromToken } from "@/lib/event-auth";
import { listEvents } from "@/lib/event-queries";
import { parseEventTab } from "@/lib/event-types";
import { isMissingDatabaseConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = parseEventTab(params.tab);
  const jar = await cookies();
  const actor = getEventActorFromToken(jar.get(SESSION_COOKIE)?.value);

  if (!actor) {
    return (
      <div className="flex min-h-full flex-col">
        <AppHeader current="events" />
        <main className="mx-auto w-full max-w-6xl px-4 py-6">
          <StatusCard title="Sign in required" body="Staff login is required to view events." />
        </main>
      </div>
    );
  }

  try {
    const result = await listEvents(tab, actor);
    return (
      <div className="flex min-h-full flex-col">
        <AppHeader current="events" />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
          <EventsList
            actor={actor}
            tab={result.tab}
            rows={result.rows}
            upcomingCount={result.upcomingCount}
            pastCount={result.pastCount}
            mineCount={result.mineCount}
            created={params.created === "1"}
            forbidden={params.error === "forbidden"}
          />
        </main>
      </div>
    );
  } catch (error) {
    return (
      <div className="flex min-h-full flex-col">
        <AppHeader current="events" />
        <main className="mx-auto w-full max-w-6xl px-4 py-6">
          <StatusCard
            title="Events unavailable"
            body={
              isMissingDatabaseConfig(error)
                ? "DATABASE_URL is not set. Add it to .env.local, then restart the app."
                : error instanceof Error
                  ? error.message
                  : "The events list could not be loaded."
            }
          />
        </main>
      </div>
    );
  }
}
