import Link from "next/link";
import { MessagesNew } from "@/components/messages-new";
import { pillClass } from "@/components/page-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DirectorySearchView } from "@/lib/directory-search";
import { filterMessageChannels, type MessageChannelRow, type MessageFilter } from "@/lib/messages";
import { dmDisplayName, isDmChannel } from "@/lib/messages-dm";

const FILTERS: Array<{ key: MessageFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

function preview(text: string | null) {
  if (!text) return "No messages yet";
  return text.length > 90 ? `${text.slice(0, 87)}…` : text;
}

export function MessagesInbox({
  channels,
  filter,
  viewerAlumniId,
  canCompose = false,
  compose = false,
  searchView = "alum",
}: {
  channels: MessageChannelRow[];
  filter: MessageFilter;
  viewerAlumniId?: string | null;
  canCompose?: boolean;
  compose?: boolean;
  searchView?: DirectorySearchView;
}) {
  const rows = filterMessageChannels(channels, filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
                className={pillClass(active)}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        {canCompose ? (
          <Button asChild size="sm">
            <Link href="/messages/new">New message</Link>
          </Button>
        ) : null}
      </div>

      {compose && canCompose ? (
        <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <MessagesNew view={searchView} viewerAlumniId={viewerAlumniId} heading={false} />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          {filter === "unread"
            ? "No unread channels."
            : filter === "groups"
              ? "Group chat is not available yet."
              : "No channels yet."}
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          {rows.map((channel) => (
            <li key={channel.id}>
              <Link href={`/messages/${channel.slug}`} className="block px-4 py-3 hover:bg-muted/40">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-navy">
                    {isDmChannel(channel) ? dmDisplayName(channel, viewerAlumniId) : channel.name}
                  </p>
                  {channel.is_pinned || channel.kind === "official" ? (
                    <Badge variant="secondary">Official</Badge>
                  ) : isDmChannel(channel) ? (
                    <Badge variant="outline">Direct</Badge>
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
