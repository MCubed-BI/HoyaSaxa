import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      href: canOpenStaffDirectory ? "/" : "/directory",
      title: "Directory",
      body: canOpenStaffDirectory
        ? "Staff directory and athlete cards."
        : "Read-only Hoya Directory. Profiles stay with the Directory lane.",
    },
    {
      href: "/portal/events",
      title: "Events",
      body: "Upcoming / Past / My Events stub until the Events lane lands.",
    },
    {
      href: "/newsflash",
      title: "News",
      body: "Lars Newsflash — board writes, alumni read.",
    },
    {
      href: "/portal/giving",
      title: "Giving",
      body: "Pledge amounts now. Stripe and campaigns stay with the Giving lane.",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <Link key={action.title} href={action.href}>
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardContent className="py-4">
              <p className="font-medium text-navy">{action.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{action.body}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </section>
  );
}

export function UpcomingEventCard({ event }: { event: UpcomingEvent }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Upcoming event
        </p>
        <CardTitle className="text-navy">{event.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-navy">{formatLockerDate(event.startsAt)}</p>
        {event.location ? <p className="text-sm text-muted-foreground">{event.location}</p> : null}
        <p className="text-sm text-muted-foreground">{event.body}</p>
        <p className="text-xs text-muted-foreground">
          Source:{" "}
          {event.source === "events"
            ? "Events lane"
            : event.source === "newsflash"
              ? "Newsflash date"
              : "Demo until Events/Newsflash dates exist"}
        </p>
        <Link href={event.href} className="inline-flex text-sm underline underline-offset-2">
          Open details
        </Link>
      </CardContent>
    </Card>
  );
}

export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No recent activity yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border bg-muted/40 px-4 py-3">
          <p className="text-sm font-medium text-navy">{item.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.body} · {formatLockerDate(item.when)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function FeedPostCard({ post }: { post: FeedPost }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {post.author_role === "official" ? "Official" : "Alumni"}
          {post.source === "newsflash" ? " · Newsflash" : ""} · {post.author_label}
        </p>
        {post.title ? <CardTitle className="text-navy">{post.title}</CardTitle> : null}
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="whitespace-pre-wrap text-sm">{post.body}</p>
        <p className="text-xs text-muted-foreground">{formatLockerDate(post.created_at)}</p>
      </CardContent>
    </Card>
  );
}
