import Link from "next/link";
import { PageHeader, pillClass } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canCreateEvents, type EventActor } from "@/lib/event-auth";
import { formatEventWhen } from "@/lib/event-datetime";
import type { EventListItem, EventTab } from "@/lib/event-types";

const TABS: { id: EventTab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "mine", label: "My Events" },
];

function tabHref(tab: EventTab) {
  return tab === "upcoming" ? "/events" : `/events?tab=${tab}`;
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
}: {
  actor: EventActor;
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
  const canCreate = canCreateEvents(actor.role);
  const emptyCopy =
    tab === "upcoming"
      ? "No upcoming events yet. Coach or board staff can create one."
      : tab === "past"
        ? "No past events yet."
        : "Events you create or add appear here.";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Program"
        title="Events"
        description="Upcoming, past, and events you created or added. Each row shows date, title, category, location, and thumbnail."
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/events/new">Create Event</Link>
            </Button>
          ) : null
        }
      />

      {created ? (
        <p className="rounded-xl border bg-card px-4 py-3 text-sm text-navy shadow-[var(--shadow-xs)]">Event saved.</p>
      ) : null}
      {forbidden ? (
        <p className="text-sm text-destructive">Create Event is limited to coach and board staff.</p>
      ) : null}

      <nav className="flex flex-wrap gap-2" aria-label="Event lists">
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={tabHref(item.id)}
              aria-current={active ? "page" : undefined}
              className={pillClass(active)}
            >
              {item.label} ({counts[item.id]})
            </Link>
          );
        })}
      </nav>

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
                  <form action={`/api/events/${event.id}/rsvp`} method="post" className="mt-2">
                    <input type="hidden" name="next" value={tabHref(tab)} />
                    <Button type="submit" variant="outline" size="sm">
                      {event.rsvped ? "Remove from My Events" : "Add to My Events"}
                    </Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
