import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventCheckInScanner } from "@/components/event-check-in-scanner";
import { EventsChrome } from "@/components/events-chrome";
import { Notice, PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { Button } from "@/components/ui/button";
import { getEventActor } from "@/lib/event-actor";
import { getEventById, isEventRecordId, listEventAttendance } from "@/lib/event-attendance";
import { canStaffCheckInOthers } from "@/lib/event-auth";
import { formatEventWhen } from "@/lib/event-datetime";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function EventScanCheckInPage({
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
          <StatusCard title="Sign in required" body="Sign in as an admin to check guests in." />
        </PageMain>
      </EventsChrome>
    );
  }

  if (!canStaffCheckInOthers(actor)) {
    redirect(`/events/${id}/check-in`);
  }

  try {
    const event = await getEventById(id);
    if (!event) notFound();
    const attendees = await listEventAttendance(id);
    const when = formatEventWhen(event.startsAt);
    const status = Array.isArray(query.status) ? query.status[0] : query.status;
    const guestRaw = Array.isArray(query.guest) ? query.guest[0] : query.guest;
    const guest = guestRaw ? decodeURIComponent(guestRaw) : null;

    return (
      <EventsChrome locker={locker}>
        <PageMain width="record">
          <PageHeader
            eyebrow="Check you in"
            title={event.title}
            description={`${when.label}${event.location ? ` · ${event.location}` : ""}. Scan each alum’s QR to record attendance.`}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href={`/events/${id}/check-in`}>Your code</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/events">All events</Link>
                </Button>
              </div>
            }
          />

          {status === "checked" ? (
            <Notice tone="success">{guest ? `${guest} is checked in.` : "Guest checked in."}</Notice>
          ) : null}
          {status === "already" ? (
            <Notice>{guest ? `${guest} was already checked in.` : "Already checked in."}</Notice>
          ) : null}
          {status === "invalid" ? (
            <Notice tone="danger">That QR is invalid, expired, or for a different event.</Notice>
          ) : null}
          {status === "forbidden" ? (
            <Notice tone="danger">Only admins can check guests in.</Notice>
          ) : null}

          <EventCheckInScanner eventId={event.id} />

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
            title="Scanner unavailable"
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
