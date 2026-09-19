"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/icons";
import { pillClass } from "@/components/page-chrome";
import { EmptyState } from "@/components/query-state";
import { SearchField } from "@/components/search-field";
import { Timestamp } from "@/components/timestamp";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";

type ChannelCard = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  description: string | null;
  is_pinned: boolean;
  last_post_at: string | null;
  last_post_preview: string | null;
  unread_count: number;
};

const FILTERS: Array<{ key: "all" | "unread" | "groups"; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "groups", label: "Groups" },
];

function preview(text: string | null) {
  if (!text) return "No messages yet";
  return text.length > 90 ? `${text.slice(0, 87)}…` : text;
}

export function MessagesInboxView({
  rows,
  filter,
  unread,
}: {
  rows: ChannelCard[];
  filter: "all" | "unread" | "groups";
  unread: number;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((channel) =>
      [channel.name, channel.description, channel.last_post_preview]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [q, rows]);

  const emptyBody =
    filter === "unread"
      ? "No unread channels."
      : filter === "groups"
        ? "No group channels."
        : "No channels yet.";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Search channels"
          label="Search messages"
          className="sm:max-w-xs"
        />
      </div>
      {unread > 0 ? (
        <p className="text-sm text-muted-foreground">{formatNumber(unread)} unread</p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="Nothing in this filter" body={emptyBody} icon="messages" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No channels match" body="Try another name or clear search." icon="search" />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          {filtered.map((channel) => (
            <li key={channel.id}>
              <Link href={`/messages/${channel.slug}`} className="block px-4 py-3 hover:bg-muted/40">
                <div className="flex flex-wrap items-center gap-2">
                  <AppIcon
                    name={channel.kind === "official" || channel.is_pinned ? "newsflash" : "messages"}
                    className="size-4 text-gold"
                  />
                  <p className="font-medium text-navy">{channel.name}</p>
                  {channel.is_pinned || channel.kind === "official" ? (
                    <Badge variant="secondary">Official</Badge>
                  ) : (
                    <Badge variant="outline">Group</Badge>
                  )}
                  {channel.unread_count > 0 ? <Badge>{formatNumber(channel.unread_count)} new</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{preview(channel.last_post_preview)}</p>
                {channel.last_post_at ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <Timestamp value={channel.last_post_at} />
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
