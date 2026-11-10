"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { INBOX_POLL_MS } from "@/lib/messages-ui";

export type InboxChannel = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  is_pinned: boolean;
  last_post_preview: string | null;
  unread_count: number;
};

function preview(text: string | null) {
  if (!text) return "No messages yet";
  return text.length > 90 ? `${text.slice(0, 87)}…` : text;
}

function isDm(kind: string) {
  return kind === "dm";
}

export function MessagesInboxLive({
  initialChannels,
  filter,
}: {
  initialChannels: InboxChannel[];
  filter: string;
}) {
  const [channels, setChannels] = useState(initialChannels);

  useEffect(() => {
    setChannels(initialChannels);
  }, [initialChannels]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.hidden) return;
      const params = filter && filter !== "all" ? `?filter=${encodeURIComponent(filter)}` : "";
      try {
        const response = await fetch(`/api/messages${params}`, { credentials: "same-origin" });
        if (!response.ok) return;
        const data = (await response.json()) as { channels?: InboxChannel[] };
        if (!cancelled && Array.isArray(data.channels)) {
          setChannels(data.channels);
        }
      } catch {
        // Keep the last inbox snapshot if a poll fails.
      }
    }

    const timer = window.setInterval(() => void poll(), INBOX_POLL_MS);
    const onFocus = () => void poll();
    const onVisibility = () => {
      if (!document.hidden) void poll();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [filter]);

  if (channels.length === 0) {
    return (
      <p className="rounded-xl border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
        {filter === "unread"
          ? "No unread channels."
          : filter === "groups"
            ? "Group chat is not available yet."
            : "No channels yet."}
      </p>
    );
  }

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
      {channels.map((channel) => (
        <li key={channel.id}>
          <Link href={`/messages/${channel.slug}`} className="block px-4 py-3 hover:bg-muted/40">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-navy">{channel.name}</p>
              {channel.is_pinned || channel.kind === "official" ? (
                <Badge variant="secondary">Official</Badge>
              ) : isDm(channel.kind) ? (
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
  );
}
