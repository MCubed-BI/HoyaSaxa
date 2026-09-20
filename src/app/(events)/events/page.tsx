import { EventsChrome } from "@/components/events-chrome";
import { EventsList } from "@/components/events-list";
import { PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { getEventActor } from "@/lib/event-actor";
import { parseEventFilters } from "@/lib/event-filters";
import { listEvents } from "@/lib/event-queries";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseEventFilters(params);
  const [actor, locker] = await Promise.all([getEventActor(), getLockerViewer()]);

  if (!actor) {
    return (
      <EventsChrome locker={locker}>
        <PageMain>
          <StatusCard title="Sign in required" body="Sign in to view events." />
        </PageMain>
      </EventsChrome>
    );
  }

  try {
    const result = await listEvents(filters.tab, actor, filters);
    return (
      <EventsChrome locker={locker}>
        <PageMain>
          <EventsList
            actor={actor}
            filters={filters}
            tab={result.tab}
            rows={result.rows}
            upcomingCount={result.upcomingCount}
            pastCount={result.pastCount}
            mineCount={result.mineCount}
            created={params.created === "1"}
            forbidden={params.error === "forbidden"}
          />
        </PageMain>
      </EventsChrome>
    );
  } catch (error) {
    return (
      <EventsChrome locker={locker}>
        <PageMain>
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
        </PageMain>
      </EventsChrome>
    );
  }
}
