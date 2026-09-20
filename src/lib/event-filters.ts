import { isEventCategory, type EventCategory } from "@/lib/event-auth";
import { parseEventTab, type EventTab } from "@/lib/event-types";

export type EventListFilters = {
  tab: EventTab;
  q: string;
  categories: EventCategory[];
};

function asList(value: string | string[] | undefined) {
  const items = Array.isArray(value) ? value : value != null ? [value] : [];
  const out: string[] = [];
  for (const item of items) {
    for (const part of String(item).split(",")) {
      const trimmed = part.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return [...new Set(out)];
}

function first(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function emptyEventFilters(): EventListFilters {
  return { tab: "upcoming", q: "", categories: [] };
}

export function parseEventFilters(
  searchParams: Record<string, string | string[] | undefined>,
): EventListFilters {
  return {
    tab: parseEventTab(searchParams.tab ?? searchParams.when),
    q: first(searchParams, "q"),
    categories: asList(searchParams.category ?? searchParams.categories).filter(isEventCategory),
  };
}

export function hasExtraEventFilters(filters: EventListFilters) {
  return Boolean(filters.q || filters.categories.length);
}

export function eventFiltersToSearchParams(filters: EventListFilters) {
  const params = new URLSearchParams();
  if (filters.tab !== "upcoming") params.set("tab", filters.tab);
  if (filters.q) params.set("q", filters.q);
  for (const category of filters.categories) params.append("category", category);
  return params;
}

export function eventsHref(filters: EventListFilters, extras?: Record<string, string | undefined>) {
  const params = eventFiltersToSearchParams(filters);
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
  }
  const qs = params.toString();
  return qs ? `/events?${qs}` : "/events";
}

export type EventFilterChip = {
  id: string;
  label: string;
  href: string;
};

export function eventFilterChips(filters: EventListFilters): EventFilterChip[] {
  const chips: EventFilterChip[] = [];
  if (filters.q) {
    chips.push({ id: "q", label: `Search: ${filters.q}`, href: eventsHref({ ...filters, q: "" }) });
  }
  for (const category of filters.categories) {
    chips.push({
      id: `category-${category}`,
      label: `Category: ${category}`,
      href: eventsHref({
        ...filters,
        categories: filters.categories.filter((item) => item !== category),
      }),
    });
  }
  return chips;
}

export function buildEventFilterSql(
  startIndex: number,
  filters: Pick<EventListFilters, "q" | "categories">,
  alias = "e",
) {
  const col = alias ? `${alias}.` : "";
  const where: string[] = [];
  const params: unknown[] = [];
  let i = startIndex;
  const q = filters.q.trim();
  if (q) {
    where.push(`(
      ${col}title ILIKE $${i}
      OR coalesce(${col}location, '') ILIKE $${i}
      OR coalesce(${col}description, '') ILIKE $${i}
      OR ${col}category ILIKE $${i}
    )`);
    params.push(`%${q}%`);
    i += 1;
  }
  if (filters.categories.length) {
    where.push(`${col}category = ANY($${i}::text[])`);
    params.push(filters.categories);
    i += 1;
  }
  return {
    sql: where.length ? ` AND ${where.join(" AND ")}` : "",
    params,
    nextIndex: i,
  };
}
