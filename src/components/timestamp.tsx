"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { formatDateTime, formatRelativeTime, parseDate } from "@/lib/format";

export function Timestamp({
  value,
  prefer = "relative",
  className,
}: {
  value: Date | string | number | null | undefined;
  prefer?: "relative" | "absolute";
  className?: string;
}) {
  const date = parseDate(value);
  const absolute = formatDateTime(value);
  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    setRelative(formatRelativeTime(value));
  }, [value]);

  if (!date || !absolute) return null;

  const label = prefer === "relative" ? (relative ?? absolute) : absolute;
  return (
    <time dateTime={date.toISOString()} title={absolute} className={cn("whitespace-nowrap", className)}>
      {label}
    </time>
  );
}

export function LoadedStamp({
  value,
  className,
}: {
  value?: Date | string | number | null;
  className?: string;
}) {
  const stamp = value ?? new Date().toISOString();
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Loaded <Timestamp value={stamp} />
    </p>
  );
}
