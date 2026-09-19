import { Suspense } from "react";
import { EventsChrome } from "@/components/events-chrome";
import { EventsList } from "@/components/events-list";
import { PageMain } from "@/components/page-chrome";
import { EventsListSkeleton } from "@/components/page-skeletons";
import { ErrorState } from "@/components/query-state";
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
        <PageMain>
          <ErrorState title="Sign in required" body="Sign in to view events." />
        </PageMain>
      </EventsChrome>
    );
  }

  return (
    <EventsChrome locker={locker}>
      <PageMain>
        <Suspense fallback={<EventsListSkeleton />}>
          <EventsBody
            tab={tab}
            actor={actor}
            created={params.created === "1"}
            forbidden={params.error === "forbidden"}
          />
        </Suspense>
      </PageMain>
    </EventsChrome>
  );
}

async function EventsBody({
  tab,
  actor,
  created,
  forbidden,
}: {
  tab: ReturnType<typeof parseEventTab>;
  actor: NonNullable<Awaited<ReturnType<typeof getEventActor>>>;
  created: boolean;
  forbidden: boolean;
}) {
  try {
    const result = await listEvents(tab, actor);
    return (
      <EventsList
        actor={actor}
        tab={result.tab}
        rows={result.rows}
        upcomingCount={result.upcomingCount}
        pastCount={result.pastCount}
        mineCount={result.mineCount}
        created={created}
        forbidden={forbidden}
        loadedAt={new Date().toISOString()}
      />
    );
  } catch (error) {
    return (
      <ErrorState
        title="Events unavailable"
        body={
          isMissingDatabaseConfig(error)
            ? "DATABASE_URL is not set. Add it to .env.local, then restart the app."
            : error instanceof Error
              ? error.message
              : "The events list could not be loaded."
        }
      />
    );
  }
}
