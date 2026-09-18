import Link from "next/link";
import { CalendarDays, Gift, Newspaper, Users } from "lucide-react";
import type { ActivityItem, FeedPost, UpcomingEvent } from "@/lib/locker-data";

export function formatLockerDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function QuickActions({ canOpenStaffDirectory }: { canOpenStaffDirectory: boolean }) {
  const actions = [
    {
      href: canOpenStaffDirectory ? "/" : "/feed?tab=alumni",
      title: "Directory",
      body: canOpenStaffDirectory
        ? "Staff directory and athlete cards."
        : "Alumni posts for now. Profiles land with the Directory lane.",
      icon: Users,
    },
    {
      href: "/events",
      title: "Events",
      body: "Calendar and RSVP live with the Events lane.",
      icon: CalendarDays,
    },
    {
      href: "/newsflash",
      title: "News",
      body: "Lars Newsflash — board writes, alumni read.",
      icon: Newspaper,
    },
    {
      href: "/giving",
      title: "Giving",
      body: "Campaigns and pledges live with the Giving lane.",
      icon: Gift,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.title}
            href={action.href}
            className="rounded-xl border border-gold/20 bg-card/80 p-4 transition-colors hover:border-gold/50 hover:bg-card"
          >
            <Icon className="size-4 text-gold" />
            <p className="mt-3 font-heading text-lg text-white">{action.title}</p>
            <p className="mt-1 text-sm text-white/65">{action.body}</p>
          </Link>
        );
      })}
    </section>
  );
}

export function UpcomingEventCard({ event }: { event: UpcomingEvent }) {
  return (
    <article className="overflow-hidden rounded-xl border border-gold/30 bg-card">
      <div className="border-b border-gold/20 bg-gold/10 px-5 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold">
          Upcoming event
        </p>
      </div>
      <div className="space-y-2 px-5 py-4">
        <h3 className="font-heading text-2xl text-white">{event.title}</h3>
        <p className="text-sm text-gold">{formatLockerDate(event.startsAt)}</p>
        {event.location ? <p className="text-sm text-white/70">{event.location}</p> : null}
        <p className="text-sm text-white/70">{event.body}</p>
        <p className="text-xs text-white/45">
          Source: {event.source === "events" ? "Events lane" : event.source === "newsflash" ? "Newsflash date" : "Locker demo"}
        </p>
        <Link href={event.href} className="inline-flex text-sm text-gold hover:underline">
          Open details
        </Link>
      </div>
    </article>
  );
}

export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-white/60">No recent locker activity yet.</p>
    );
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-white/10 bg-navy/40 px-4 py-3">
          <p className="text-sm font-medium text-white">{item.title}</p>
          <p className="mt-0.5 text-xs text-white/55">
            {item.body} · {formatLockerDate(item.when)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function FeedPostCard({ post }: { post: FeedPost }) {
  return (
    <article className="rounded-xl border border-white/10 bg-card/90 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-gold">
        <span>{post.author_role === "official" ? "Official" : "Alumni"}</span>
        <span className="text-white/35">·</span>
        <span className="text-white/55">{post.author_label}</span>
        {post.source === "newsflash" ? (
          <>
            <span className="text-white/35">·</span>
            <span>Newsflash</span>
          </>
        ) : null}
      </div>
      {post.title ? <h3 className="mt-2 font-heading text-xl text-white">{post.title}</h3> : null}
      <p className="mt-2 whitespace-pre-wrap text-sm text-white/75">{post.body}</p>
      <p className="mt-3 text-xs text-white/40">{formatLockerDate(post.created_at)}</p>
    </article>
  );
}
