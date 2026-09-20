import Link from "next/link";
import { PageHeader, pillClass } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EVENT_CATEGORIES, canCreateEvents, type EventActor, type EventCategory } from "@/lib/event-auth";
import { formatEventWhen } from "@/lib/event-datetime";
import { eventListHref, type EventListItem, type EventTab } from "@/lib/event-types";

const TABS: { id: EventTab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "mine", label: "My Events" },
];

function tabHref(tab: EventTab, category?: EventCategory | null) {
  return eventListHref(tab, category);
}

export function EventsList({
  actor,
  tab,
  rows,
  upcomingCount,
  pastCount,
  mineCount,
  created,
  forbidden,
  category,
}: {
  actor: EventActor;
  tab: EventTab;
  rows: EventListItem[];
  upcomingCount: number;
  pastCount: number;
  mineCount: number;
  created?: boolean;
  forbidden?: boolean;
  category?: EventCategory | null;
}) {
  const counts: Record<EventTab, number> = {
    upcoming: upcomingCount,
    past: pastCount,
    mine: mineCount,
  };
  const canCreate = canCreateEvents(actor.role);
  const emptyCopy =
    tab === "upcoming"
      ? "No upcoming events yet. Admin, Board, or Alum can create one."
      : tab === "past"
        ? "No past events yet."
        : "Events you create or add appear here.";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Program"
        title="Events"
        description="Filter by upcoming/past/mine and by type. Anyone signed in (Admin, Board, or Alum) can post an event."
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
        <p className="text-sm text-destructive">Sign in as Alum, Board, or Admin to create an event.</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-2" aria-label="Event lists">
          {TABS.map((item) => {
            const active = item.id === tab;
            return (
              <Link
                key={item.id}
                href={tabHref(item.id, category)}
                aria-current={active ? "page" : undefined}
                className={pillClass(active)}
              >
                {item.label} ({counts[item.id]})
              </Link>
            );
          })}
        </nav>
        <form method="get" className="flex items-center gap-2">
          {tab !== "upcoming" ? <input type="hidden" name="tab" value={tab} /> : null}
          <label htmlFor="category" className="text-sm text-muted-foreground">
            Type
          </label>
          <select
            id="category"
            name="category"
            defaultValue={category ?? ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">All types</option>
            {EVENT_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button type="submit" className="text-sm font-medium text-navy underline-offset-4 hover:underline">
            Filter
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <StatusCard title="No events in this list" body={emptyCopy} />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          {rows.map((event) => {
            const when = formatEventWhen(event.starts_at);
            return (
              <li key={event.id} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {event.thumbnail_url ? (
                    // Arbitrary event URLs; next/image would need a remote allowlist.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.thumbnail_url} alt="" width={56} height={56} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      {event.category.slice(0, 2)}
                    </span>
                  )}
                </div>
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
                      <input type="hidden" name="next" value={tabHref(tab, category)} />
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
