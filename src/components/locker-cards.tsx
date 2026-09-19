import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/icons";
import { Timestamp } from "@/components/timestamp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { ActivityItem, FeedPost, UpcomingEvent } from "@/lib/locker-data";

export function formatLockerDate(value: string) {
  return formatDateTime(value) ?? value;
}

export function QuickActions({ canOpenStaffDirectory }: { canOpenStaffDirectory: boolean }) {
  const actions: Array<{ href: string; title: string; body: string; icon: AppIconName }> = [
    {
      href: canOpenStaffDirectory ? "/" : "/directory",
      title: "Directory",
      icon: "directory",
      body: canOpenStaffDirectory
        ? "Staff directory and athlete cards."
        : "Read-only Hoya Directory. Profiles stay with the Directory lane.",
    },
    {
      href: "/events",
      title: "Events",
      icon: "events",
      body: "Upcoming, past, and events you created or added.",
    },
    {
      href: "/newsflash",
      title: "News",
      icon: "newsflash",
      body: "Lars Newsflash — board writes, alumni read.",
    },
    {
      href: "/giving",
      title: "Giving",
      icon: "giving",
      body: "Record an unpaid pledge intent. Stripe checkout is later.",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <Link key={action.title} href={action.href}>
          <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
            <CardContent className="py-4">
              <p className="flex items-center gap-2 font-medium text-navy">
                <AppIcon name={action.icon} className="size-4 text-gold" />
                {action.title}
              </p>
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
        <p className="text-sm text-navy">
          <Timestamp value={event.startsAt} prefer="absolute" />
        </p>
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
        <li key={item.id} className="rounded-xl border bg-muted/40 px-4 py-3">
          <p className="text-sm font-medium text-navy">{item.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.body} · <Timestamp value={item.when} />
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
        <p className="text-xs text-muted-foreground">
          <Timestamp value={post.created_at} />
        </p>
      </CardContent>
    </Card>
  );
}
