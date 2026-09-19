import type { AlumniListItem } from "@/lib/types";

const HONORIFIC = /^(mr|mrs|ms|miss|dr|prof|rev|sir|hon)\.?$/i;

function stripHonorifics(name: string) {
  return name
    .split(/\s+/)
    .filter((part) => !HONORIFIC.test(part))
    .join(" ")
    .trim();
}

export function displayName(person: Pick<AlumniListItem, "preferred_name" | "first_name" | "last_name" | "full_name">) {
  const last = person.last_name?.trim() || "";
  const preferred = person.preferred_name ? stripHonorifics(person.preferred_name.trim()) : "";
  const looksLikeNickname =
    Boolean(preferred && last) && !preferred.toLowerCase().includes(last.toLowerCase());

  if (looksLikeNickname) return `${preferred} ${last}`;
  if (person.full_name?.trim()) return person.full_name.trim();
  return [person.first_name, last].filter(Boolean).join(" ") || preferred || "Unknown";
}

export function locationLabel(city?: string | null, state?: string | null) {
  return [city, state].filter(Boolean).join(", ") || null;
}

export function jobLabel(company?: string | null, title?: string | null) {
  if (company && title) return `${title}, ${company}`;
  return title || company || null;
}

export function initials(person: Pick<AlumniListItem, "preferred_name" | "first_name" | "last_name" | "full_name">) {
  const name = displayName(person);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const APP_LOCALE = "en-US";
export const APP_TIMEZONE = "America/New_York";

export function parseDate(value: Date | string | number | null | undefined) {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateParts(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(APP_LOCALE, { timeZone: APP_TIMEZONE, ...options }).format(date);
}

export function formatDate(value: Date | string | number | null | undefined) {
  const date = parseDate(value);
  if (!date) return null;
  return dateParts(date, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(value: Date | string | number | null | undefined) {
  const date = parseDate(value);
  if (!date) return null;
  const day = dateParts(date, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const time = dateParts(date, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time} ET`;
}

export function formatRelativeTime(
  value: Date | string | number | null | undefined,
  now: Date | number = Date.now(),
) {
  const date = parseDate(value);
  if (!date) return null;
  const nowMs = now instanceof Date ? now.getTime() : now;
  const deltaSec = Math.round((date.getTime() - nowMs) / 1000);
  const abs = Math.abs(deltaSec);
  const rtf = new Intl.RelativeTimeFormat(APP_LOCALE, { numeric: "auto" });
  if (abs < 45) return rtf.format(0, "second");
  if (abs < 90) return rtf.format(deltaSec < 0 ? -1 : 1, "minute");
  if (abs < 3600) return rtf.format(Math.trunc(deltaSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.trunc(deltaSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.trunc(deltaSec / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.trunc(deltaSec / 2_592_000), "month");
  return rtf.format(Math.trunc(deltaSec / 31_536_000), "year");
}

export function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(APP_LOCALE).format(value);
}

export function formatCurrency(cents: number) {
  const dollars = cents / 100;
  return new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(dollars);
}

export function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`;
}

export function resultRange(page: number, pageSize: number, total: number) {
  if (total <= 0) return { start: 0, end: 0, label: "0 results" };
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return {
    start,
    end,
    label: `Showing ${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(total)}`,
  };
}

export function pageWindow(page: number, pageCount: number, radius = 2) {
  if (pageCount <= 0) return [] as Array<number | "ellipsis">;
  const current = Math.min(Math.max(1, page), pageCount);
  const pages = new Set<number>([1, pageCount]);
  for (let i = current - radius; i <= current + radius; i++) {
    if (i >= 1 && i <= pageCount) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  for (const item of sorted) {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && item - prev > 1) out.push("ellipsis");
    out.push(item);
  }
  return out;
}
