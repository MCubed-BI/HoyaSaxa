import Link from "next/link";
import { EventsChrome } from "@/components/events-chrome";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { Button } from "@/components/ui/button";
import { getEventActor } from "@/lib/event-actor";
import { canStaffCheckInOthers } from "@/lib/event-auth";
import { listEvents } from "@/lib/event-queries";
import { formatEventWhen } from "@/lib/event-datetime";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function EventCheckInIndexPage() {
  const [actor, locker] = await Promise.all([getEventActor(), getLockerViewer()]);

  if (!actor) {
    return (
      <EventsChrome locker={locker}>
        <PageMain>
          <StatusCard title="Sign in required" body="Sign in with staff or your alumni session to check in." />
        </PageMain>
      </EventsChrome>
    );
  }

  try {
    const [upcoming, past] = await Promise.all([listEvents("upcoming", actor), listEvents("past", actor)]);
    const rows = [...upcoming.rows, ...past.rows];
    const canCheckOthersIn = canStaffCheckInOthers(actor);

    return (
      <EventsChrome locker={locker}>
        <PageMain>
          <PageHeader
            eyebrow="Events"
            title="Check in"
            description="Open an event to show your QR. An admin scans it to check you in — one durable record per person."
            actions={
              <Button asChild variant="outline">
                <Link href="/events/attendance">Attendance ranks</Link>
              </Button>
            }
          />
          {rows.length === 0 ? (
            <StatusCard title="No events yet" body="Admin, Board, or Alum can create an event first." />
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
              {rows.map((event) => {
                const when = formatEventWhen(event.starts_at);
                return (
                  <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {when.label}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant={event.checked_in ? "outline" : "default"}>
                        <Link href={`/events/${event.id}/check-in`}>
                          {event.checked_in ? "Checked in" : "Check in"}
                        </Link>
                      </Button>
                      {canCheckOthersIn ? (
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/events/${event.id}/scan`}>Check you in</Link>
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </PageMain>
      </EventsChrome>
    );
  } catch (error) {
    return (
      <EventsChrome locker={locker}>
        <PageMain>
          <StatusCard
            title="Check-in unavailable"
            body={
              isMissingDatabaseConfig(error)
                ? "DATABASE_URL is not set. Add it to .env.local, then restart the app."
                : error instanceof Error
                  ? error.message
                  : "Events could not be loaded."
            }
          />
        </PageMain>
      </EventsChrome>
    );
  }
}
