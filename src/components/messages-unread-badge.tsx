"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

function formatUnreadBadgeLabel(count: number) {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}

const POLL_MS = 30_000;

export function MessagesUnreadBadge({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const response = await fetch("/api/messages/unread", { credentials: "same-origin" });
        if (!response.ok) return;
        const data = (await response.json()) as { count?: number };
        if (!cancelled && typeof data.count === "number") {
          setCount(data.count);
        }
      } catch {
        // Keep the last known count if the poll fails.
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    const onFocus = () => void load();
    const onVisibility = () => {
      if (!document.hidden) void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const label = formatUnreadBadgeLabel(count);
  if (!label) return null;

  return (
    <span
      aria-label={`${count} unread message${count === 1 ? "" : "s"}`}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] font-semibold leading-none",
        compact
          ? "absolute -top-1.5 -right-2 min-w-4 px-1 py-0.5 text-[9px]"
          : "ml-1 min-w-4 px-1 py-0.5 text-[10px]",
        className,
      )}
    >
      {label}
    </span>
  );
}
