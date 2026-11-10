import Link from "next/link";
import { MessagesInboxLive, type InboxChannel } from "@/components/messages-inbox-live";
import { MessagesNew } from "@/components/messages-new";
import { pillClass } from "@/components/page-chrome";
import { Button } from "@/components/ui/button";
import type { DirectorySearchView } from "@/lib/directory-search";
import { filterMessageChannels, type MessageChannelRow, type MessageFilter } from "@/lib/messages";
import { dmDisplayName, isDmChannel } from "@/lib/messages-dm";

const FILTERS: Array<{ key: MessageFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

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
  const rows: InboxChannel[] = filterMessageChannels(channels, filter).map((channel) => ({
    id: channel.id,
    slug: channel.slug,
    name: isDmChannel(channel) ? dmDisplayName(channel, viewerAlumniId) : channel.name,
    kind: channel.kind,
    is_pinned: channel.is_pinned,
    last_post_preview: channel.last_post_preview,
    unread_count: channel.unread_count,
  }));

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

      <MessagesInboxLive initialChannels={rows} filter={filter} />
    </div>
  );
}
