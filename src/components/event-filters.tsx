import Link from "next/link";
import { FilterChip, FilterChipRow, FilterToolbar } from "@/components/filter-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EVENT_CATEGORIES } from "@/lib/event-auth";
import {
  eventFilterChips,
  eventsHref,
  hasExtraEventFilters,
  type EventListFilters,
} from "@/lib/event-filters";

export function EventFiltersForm({ filters }: { filters: EventListFilters }) {
  const chips = eventFilterChips(filters);
  const categoryValue = filters.categories.length === 1 ? filters.categories[0] : "";

  return (
    <FilterToolbar
      chips={
        chips.length ? (
          <FilterChipRow label="Active filters" clearHref={eventsHref({ ...filters, q: "", categories: [] })}>
            {chips.map((chip) => (
              <FilterChip key={chip.id} href={chip.href}>
                {chip.label}
              </FilterChip>
            ))}
          </FilterChipRow>
        ) : null
      }
    >
      <form action="/events" method="get" className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        {filters.tab !== "upcoming" ? <input type="hidden" name="tab" value={filters.tab} /> : null}
        {filters.categories.length > 1
          ? filters.categories.map((category) => (
              <input key={category} type="hidden" name="category" value={category} />
            ))
          : null}
        <div className="space-y-1.5">
          <label htmlFor="event-q" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Search
          </label>
          <Input
            id="event-q"
            name="q"
            defaultValue={filters.q}
            placeholder="Title, location, or details"
            aria-label="Search events"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="event-category" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Category
          </label>
          <select
            id="event-category"
            name="category"
            defaultValue={categoryValue}
            disabled={filters.categories.length > 1}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            aria-label="Filter by category"
          >
            <option value="">{filters.categories.length > 1 ? "Multiple selected" : "All categories"}</option>
            {EVENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Apply</Button>
          {hasExtraEventFilters(filters) ? (
            <Button asChild type="button" variant="outline">
              <Link href={eventsHref({ ...filters, q: "", categories: [] })}>Clear</Link>
            </Button>
          ) : null}
        </div>
      </form>
    </FilterToolbar>
  );
}
