import Link from "next/link";
import { EventsChrome } from "@/components/events-chrome";
import { PageHeader, PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { Button } from "@/components/ui/button";
import { attendancePersonFromActor, listAttendanceLeaders } from "@/lib/event-attendance";
import { getEventActor } from "@/lib/event-actor";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getLockerViewer } from "@/lib/locker-viewer";

export const dynamic = "force-dynamic";

export default async function EventAttendanceLeaderboardPage() {
  const [actor, locker] = await Promise.all([getEventActor(), getLockerViewer()]);
  if (!actor) {
    return (
      <EventsChrome locker={locker}>
        <PageMain>
          <StatusCard title="Sign in required" body="Sign in to view attendance ranks." />
        </PageMain>
      </EventsChrome>
    );
  }

  try {
    const leaders = await listAttendanceLeaders(50);
    const me = attendancePersonFromActor(actor).personKey;

    return (
      <EventsChrome locker={locker}>
        <PageMain>
          <PageHeader
            eyebrow="Events"
            title="Who attends the most"
            description="Lifetime check-ins across all events (not a season window). Raw rank and percentile are exported for Coder 3 badges — this page is not the badge UI."
            actions={
              <Button asChild variant="outline">
                <Link href="/events/check-in">Check in</Link>
              </Button>
            }
          />
          {leaders.length === 0 ? (
            <StatusCard title="No attendance yet" body="Check in to an event to start the lifetime ranks." />
          ) : (
            <ol className="divide-y overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
              {leaders.map((row) => {
                const mine = row.personKey === me;
                return (
                  <li
                    key={row.personKey}
                    className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-3"
                    aria-current={mine ? "true" : undefined}
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        #{row.rank} {row.displayName}
                        {mine ? " · you" : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Lifetime {row.attendanceCount} · top {row.percentile.toFixed(1)}% of {row.cohortSize}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </PageMain>
      </EventsChrome>
    );
  } catch (error) {
    return (
      <EventsChrome locker={locker}>
        <PageMain>
          <StatusCard
            title="Ranks unavailable"
            body={
              isMissingDatabaseConfig(error)
                ? "DATABASE_URL is not set. Add it to .env.local, then restart the app."
                : error instanceof Error
                  ? error.message
                  : "Attendance ranks could not be loaded."
            }
          />
        </PageMain>
      </EventsChrome>
    );
  }
}
