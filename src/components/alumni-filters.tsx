"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";
import { DirectoryNameSearch } from "@/components/directory-name-search";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/multi-select";
import {
  canonicalizeAlumniFilters,
  facetFilterCount,
  filtersToSearchParams,
  hasActiveFilters,
  hasFacetFilters,
  type AlumniFilters,
} from "@/lib/filters";
import type { DirectorySearchView } from "@/lib/directory-search";
import type { AlumniFacets } from "@/lib/types";

export function AlumniFiltersForm({
  filters,
  facets,
  action = "/",
  submitLabel = "Find",
  mode = "group",
  view = "admin",
}: {
  filters: AlumniFilters;
  facets: AlumniFacets;
  action?: string;
  submitLabel?: string;
  mode?: "directory" | "group";
  view?: DirectorySearchView;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState(() => canonicalizeAlumniFilters(filters));
  const [filtersOpen, setFiltersOpen] = useState(() => hasFacetFilters(filters));
  const filtersKey = JSON.stringify(filters);
  const facetCount = facetFilterCount(local);

  useEffect(() => {
    const next = canonicalizeAlumniFilters(filters);
    setLocal(next);
    if (hasFacetFilters(next)) setFiltersOpen(true);
    // Sync only when URL-derived filter values change so in-progress
    // multi-selects survive search typing and parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]"
      onSubmit={(event) => {
        event.preventDefault();
        const next = canonicalizeAlumniFilters({
          ...local,
          q: local.q.trim(),
        });
        const qs = filtersToSearchParams(next);
        const channel = new URLSearchParams(window.location.search).get("channel");
        if (channel) qs.set("channel", channel);
        const query = qs.toString();
        startTransition(() => {
          router.push(query ? `${action}?${query}` : action);
        });
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <DirectoryNameSearch
          value={local.q}
          onChange={(q) => setLocal((current) => ({ ...current, q }))}
          view={view}
          openProfileOnSelect={mode === "directory"}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={pending} className="h-11 px-4">
            {pending ? "Finding…" : submitLabel}
          </Button>
          {hasActiveFilters(filters) || hasActiveFilters(local) ? (
            <Button type="button" variant="outline" className="h-11" onClick={() => router.push(action)}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div className="border-t pt-3">
        <button
          type="button"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left text-sm font-medium text-navy hover:bg-muted/60"
        >
          <span className="flex items-center gap-2">
            Filters
            {facetCount > 0 ? (
              <span className="rounded-full bg-navy px-2 py-0.5 text-[11px] font-semibold text-white">
                {facetCount}
              </span>
            ) : (
              <span className="text-xs font-normal text-muted-foreground">State, city, position, class, season</span>
            )}
          </span>
          <ChevronDownIcon className={`size-4 text-muted-foreground transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
        </button>

        {filtersOpen ? (
          <div className="mt-3 space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MultiSelect
                label="State"
                placeholder="All states"
                options={facets.states}
                value={local.states}
                onChange={(states) => setLocal((current) => ({ ...current, states }))}
                searchable
                dropdown
              />
              <MultiSelect
                label="City"
                placeholder="All cities"
                options={facets.cities}
                value={local.cities}
                onChange={(cities) => setLocal((current) => ({ ...current, cities }))}
                searchable
                dropdown
              />
              <MultiSelect
                label="Position"
                placeholder="All positions"
                options={facets.positions}
                value={local.positions}
                onChange={(positions) => setLocal((current) => ({ ...current, positions }))}
                searchable
                dropdown
              />
              <MultiSelect
                label="Class / grad year"
                placeholder="All class years"
                options={facets.classYears}
                value={local.classYears}
                onChange={(classYears) => setLocal((current) => ({ ...current, classYears }))}
                searchable
                dropdown
              />
              <MultiSelect
                label="Season year"
                placeholder="All seasons"
                options={facets.seasonYears}
                value={local.seasonYears}
                onChange={(seasonYears) => setLocal((current) => ({ ...current, seasonYears }))}
                searchable
                dropdown
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={local.hasEmail}
                  onChange={(event) => setLocal((current) => ({ ...current, hasEmail: event.target.checked }))}
                  className="size-4 rounded border-input accent-navy"
                />
                Has email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={local.hasPhone}
                  onChange={(event) => setLocal((current) => ({ ...current, hasPhone: event.target.checked }))}
                  className="size-4 rounded border-input accent-navy"
                />
                Has phone
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={local.hasLinkedin}
                  onChange={(event) => setLocal((current) => ({ ...current, hasLinkedin: event.target.checked }))}
                  className="size-4 rounded border-input accent-navy"
                />
                Has LinkedIn
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}
