import { APP_TIMEZONE } from "@/lib/format";

const EASTERN = APP_TIMEZONE;

function tzOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - date.getTime();
}

export function fromTimeZoneLocal(localIso: string, timeZone: string) {
  const match = localIso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");
  if ([year, month, day, hour, minute, second].some((value) => Number.isNaN(value))) return null;

  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = tzOffsetMs(new Date(guess), timeZone);
  let utc = guess - firstOffset;
  const secondOffset = tzOffsetMs(new Date(utc), timeZone);
  if (secondOffset !== firstOffset) {
    utc = guess - secondOffset;
  }
  const result = new Date(utc);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function parseEventDateTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(trimmed)) {
    return fromTimeZoneLocal(trimmed, EASTERN);
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatEventWhen(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    weekday: "short",
  }).format(date);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    month: "short",
    day: "numeric",
  }).format(date);
  const year = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return { weekday, day, year, time, label: `${weekday}, ${day} ${year} · ${time} ET` };
}
