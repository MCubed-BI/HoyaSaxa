import Link from "next/link";
import { EventFiltersForm } from "@/components/event-filters";
import { PageHeader, pillClass } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canCreateEvents, type EventActor } from "@/lib/event-auth";
import { formatEventWhen } from "@/lib/event-datetime";
import { eventsHref, type EventListFilters } from "@/lib/event-filters";
import type { EventListItem, EventTab } from "@/lib/event-types";

const TABS: { id: EventTab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "mine", label: "My Events" },
];

export function EventsList({
  actor,
  filters,
  tab,
  rows,
  upcomingCount,
  pastCount,
  mineCount,
  created,
  forbidden,
}: {
  actor: EventActor;
  filters: EventListFilters;
  tab: EventTab;
  rows: EventListItem[];
  upcomingCount: number;
  pastCount: number;
  mineCount: number;
  created?: boolean;
  forbidden?: boolean;
}) {
  const counts: Record<EventTab, number> = {
    upcoming: upcomingCount,
    past: pastCount,
    mine: mineCount,
  };
  const canCreate = canCreateEvents(actor);
  const listHref = eventsHref(filters);
  const emptyCopy =
    tab === "upcoming"
      ? "No upcoming events match these filters. Admin, Board, or Alum can post one."
      : tab === "past"
        ? "No past events match these filters."
        : "Events you create or add appear here.";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Schedule"
        title="Events"
        description="Filter by upcoming or past, then search or narrow by category. Admin, Board, or Alum can post."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/events/check-in">Check in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/events/attendance">Ranks</Link>
            </Button>
            {canCreate ? (
              <Button asChild>
                <Link href="/events/new">Create Event</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {created ? (
        <p className="rounded-xl border bg-card px-4 py-3 text-sm text-navy shadow-[var(--shadow-xs)]">Event saved.</p>
      ) : null}
      {forbidden ? (
        <p className="text-sm text-destructive">Sign in as Admin, Board, or Alum to post an event.</p>
      ) : null}

      <nav className="flex flex-wrap gap-2" aria-label="When">
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={eventsHref({ ...filters, tab: item.id })}
              aria-current={active ? "page" : undefined}
              className={pillClass(active)}
            >
              {item.label} ({counts[item.id]})
            </Link>
          );
        })}
      </nav>

      <EventFiltersForm filters={filters} />

      {rows.length === 0 ? (
        <StatusCard title="No events in this list" body={emptyCopy} />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          {rows.map((event) => {
            const when = formatEventWhen(event.starts_at);
            return (
              <li key={event.id} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                {event.thumbnail_url ? (
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {/* Arbitrary event URLs; next/image would need a remote allowlist. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.thumbnail_url} alt="" width={56} height={56} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="event-date" aria-hidden>
                    <span className="event-date__month">{when.month}</span>
                    <span className="event-date__day">{when.dateNum}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{event.title}</h3>
                    <Badge variant="secondary">{event.category}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {when.label}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <form action={`/api/events/${event.id}/rsvp`} method="post">
                      <input type="hidden" name="next" value={listHref} />
                      <Button type="submit" variant="outline" size="sm">
                        {event.rsvped ? "Remove from My Events" : "Add to My Events"}
                      </Button>
                    </form>
                    <Button asChild variant={event.checked_in ? "secondary" : "outline"} size="sm">
                      <Link href={`/events/${event.id}/check-in`}>
                        {event.checked_in ? "Checked in" : "Check in"}
                      </Link>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
