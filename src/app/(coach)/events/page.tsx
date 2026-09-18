import { EventsChrome } from "@/components/events-chrome";
import { EventsList } from "@/components/events-list";
import { StatusCard } from "@/components/status-card";
import { getEventActor } from "@/lib/event-actor";
import { listEvents } from "@/lib/event-queries";
import { parseEventTab } from "@/lib/event-types";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = parseEventTab(params.tab);
  const [actor, locker] = await Promise.all([getEventActor(), getLockerViewer()]);

  if (!actor) {
    return (
      <EventsChrome locker={locker}>
        <main className="mx-auto w-full max-w-6xl px-4 py-6">
          <StatusCard title="Sign in required" body="Sign in to view events." />
        </main>
      </EventsChrome>
    );
  }

  try {
    const result = await listEvents(tab, actor);
    return (
      <EventsChrome locker={locker}>
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
      </EventsChrome>
    );
  } catch (error) {
    return (
      <EventsChrome locker={locker}>
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
      </EventsChrome>
    );
  }
}
