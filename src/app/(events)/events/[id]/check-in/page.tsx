import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCheckInForm } from "@/components/event-check-in-form";
import { EventsChrome } from "@/components/events-chrome";
import { Notice, PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { Button } from "@/components/ui/button";
import {
  attendancePersonFromActor,
  getAttendanceRecord,
  getEventById,
  isEventRecordId,
  lifetimeAttendanceCount,
  listAttendanceLeaders,
  listEventAttendance,
} from "@/lib/event-attendance";
import { canOverrideEventCheckIn } from "@/lib/event-auth";
import { getEventActor } from "@/lib/event-actor";
import { formatEventWhen } from "@/lib/event-datetime";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function EventCheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!isEventRecordId(id)) notFound();

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
    const event = await getEventById(id);
    if (!event) notFound();

    const person = attendancePersonFromActor(actor);
    const [mine, attendees, leaders] = await Promise.all([
      getAttendanceRecord(id, person.personKey),
      listEventAttendance(id),
      listAttendanceLeaders(8),
    ]);
    const lifetime = mine ? await lifetimeAttendanceCount(person.personKey) : 0;
    const myRank = leaders.find((row) => row.personKey === person.personKey);
    const when = formatEventWhen(event.startsAt);
    const status = Array.isArray(query.status) ? query.status[0] : query.status;
    const staff = canOverrideEventCheckIn(actor.role);

    return (
      <EventsChrome locker={locker}>
        <PageMain width="record">
          <PageHeader
            eyebrow="Check in"
            title={event.title}
            description={`${when.label}${event.location ? ` · ${event.location}` : ""}. One durable record per person unless staff override.`}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href="/events/check-in">All events</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/events/attendance">Ranks</Link>
                </Button>
              </div>
            }
          />

          {status === "checked" ? <Notice tone="success">You are checked in.</Notice> : null}
          {status === "already" ? <Notice>Already checked in for this event.</Notice> : null}
          {status === "updated" ? <Notice tone="success">Staff updated this check-in.</Notice> : null}
          {status === "forbidden" ? <Notice tone="danger">Staff override is required to change an existing check-in.</Notice> : null}
          {status === "guest" ? <Notice tone="danger">Add a person id or name to check someone else in.</Notice> : null}

          <EventCheckInForm
            eventId={event.id}
            actorName={actor.username}
            alreadyCheckedIn={Boolean(mine)}
            canOverride={staff}
            lifetimeCount={lifetime}
            rank={myRank?.rank ?? null}
            percentile={myRank?.percentile ?? null}
            checkedInAt={mine?.checkedInAt ?? null}
          />

          <section className="space-y-3">
            <h3 className="font-heading text-lg text-navy">Checked in ({attendees.length})</h3>
            {attendees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>
            ) : (
              <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
                {attendees.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                    <span className="font-medium">{row.displayName}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(row.checkedInAt).toLocaleString("en-US", { timeZone: "America/New_York" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
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
                  : "This event could not be loaded."
            }
          />
        </PageMain>
      </EventsChrome>
    );
  }
}
