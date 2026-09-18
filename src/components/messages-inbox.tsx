import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { filterMessageChannels, type MessageChannelRow, type MessageFilter } from "@/lib/messages";

const FILTERS: Array<{ key: MessageFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "groups", label: "Groups" },
];

function preview(text: string | null) {
  if (!text) return "No messages yet";
  return text.length > 90 ? `${text.slice(0, 87)}…` : text;
}

export function MessagesInbox({
  channels,
  filter,
}: {
  channels: MessageChannelRow[];
  filter: MessageFilter;
}) {
  const rows = filterMessageChannels(channels, filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Message filters">
        {FILTERS.map((item) => {
          const href = item.key === "all" ? "/messages" : `/messages?filter=${item.key}`;
          const active = filter === item.key;
          return (
            <Link
              key={item.key}
              href={href}
              role="tab"
              aria-selected={active}
              className={`rounded-md px-3 py-1.5 text-sm ${
                active ? "bg-navy text-white" : "bg-muted text-foreground hover:bg-accent"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          {filter === "unread"
            ? "No unread channels."
            : filter === "groups"
              ? "No group channels."
              : "No channels yet."}
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {rows.map((channel) => (
            <li key={channel.id}>
              <Link href={`/messages/${channel.slug}`} className="block px-4 py-3 hover:bg-muted/40">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-navy">{channel.name}</p>
                  {channel.is_pinned || channel.kind === "official" ? (
                    <Badge variant="secondary">Official</Badge>
                  ) : (
                    <Badge variant="outline">Group</Badge>
                  )}
                  {channel.unread_count > 0 ? <Badge>{channel.unread_count} new</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{preview(channel.last_post_preview)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
