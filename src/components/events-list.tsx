"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/icons";
import { Kpi, KpiGrid } from "@/components/kpi";
import { PageHeader, pillClass } from "@/components/page-chrome";
import { EmptyState } from "@/components/query-state";
import { SearchField } from "@/components/search-field";
import { LoadedStamp, Timestamp } from "@/components/timestamp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canCreateEvents, type EventActor } from "@/lib/event-auth";
import { formatEventWhen } from "@/lib/event-datetime";
import type { EventListItem, EventTab } from "@/lib/event-types";
import { formatCount, formatNumber } from "@/lib/format";

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
  loadedAt,
}: {
  actor: EventActor;
  tab: EventTab;
  rows: EventListItem[];
  upcomingCount: number;
  pastCount: number;
  mineCount: number;
  created?: boolean;
  forbidden?: boolean;
  loadedAt?: string;
}) {
  const [q, setQ] = useState("");
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((event) =>
      [event.title, event.category, event.location, event.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [q, rows]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Program"
        title="Events"
        description="Upcoming, past, and events you created or added. Each row shows date, title, category, and location."
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

      <KpiGrid>
        <Kpi tone={tab === "upcoming" ? "primary" : "secondary"} icon="events" label="Upcoming" value={formatNumber(upcomingCount)} />
        <Kpi tone={tab === "past" ? "primary" : "secondary"} icon="clock" label="Past" value={formatNumber(pastCount)} />
        <Kpi tone={tab === "mine" ? "primary" : "secondary"} icon="profile" label="My Events" value={formatNumber(mineCount)} />
      </KpiGrid>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                {item.label} ({formatNumber(counts[item.id])})
              </Link>
            );
          })}
        </nav>
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Search title, place, or category"
          label="Search events"
          className="sm:max-w-xs"
        />
      </div>

      {loadedAt ? <LoadedStamp value={loadedAt} /> : null}

      {rows.length === 0 ? (
        <EmptyState title="No events in this list" body={emptyCopy} icon="events" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No events match"
          body="Try another title or clear search to see this list."
          icon="search"
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          {filtered.map((event) => {
            const when = formatEventWhen(event.starts_at);
            return (
              <li key={event.id} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-navy">
                  {event.thumbnail_url ? (
                    // Arbitrary event URLs; next/image would need a remote allowlist.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.thumbnail_url} alt="" width={56} height={56} className="h-full w-full object-cover" />
                  ) : (
                    <AppIcon name="events" className="size-5 text-gold" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-navy">{event.title}</h3>
                    <Badge variant="secondary">{event.category}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <Timestamp value={event.starts_at} prefer="absolute" />
                    {event.location ? (
                      <>
                        {" · "}
                        <span className="inline-flex items-center gap-1">
                          <AppIcon name="pin" className="size-3.5" />
                          {event.location}
                        </span>
                      </>
                    ) : null}
                  </p>
                  {when.weekday ? (
                    <p className="sr-only">
                      {when.label}
                    </p>
                  ) : null}
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
      {filtered.length > 0 ? (
        <p className="text-sm text-muted-foreground">{formatCount(filtered.length, "event")}</p>
      ) : null}
    </div>
  );
}
