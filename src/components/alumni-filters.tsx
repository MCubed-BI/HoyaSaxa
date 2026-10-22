"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";
import { DirectoryNameSearch } from "@/components/directory-name-search";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/multi-select";
import type { AlumniGroupSummary } from "@/lib/alumni-groups";
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
  groups,
  selectedGroupId = "",
}: {
  filters: AlumniFilters;
  facets: AlumniFacets;
  action?: string;
  submitLabel?: string;
  mode?: "directory" | "group";
  view?: DirectorySearchView;
  /** When set (Blast), show a Saved group control in this card. */
  groups?: AlumniGroupSummary[];
  selectedGroupId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState(() => canonicalizeAlumniFilters(filters));
  const [groupId, setGroupId] = useState(selectedGroupId);
  const [filtersOpen, setFiltersOpen] = useState(() => hasFacetFilters(filters));
  const filtersKey = JSON.stringify(filters);
  const facetCount = facetFilterCount(local);
  const showGroups = Array.isArray(groups);

  useEffect(() => {
    const next = canonicalizeAlumniFilters(filters);
    setLocal(next);
    if (hasFacetFilters(next)) setFiltersOpen(true);
    // Sync only when URL-derived filter values change so in-progress
    // multi-selects survive search typing and parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    setGroupId(selectedGroupId);
  }, [selectedGroupId]);

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
        const current = new URLSearchParams(window.location.search);
        const channel = current.get("channel");
        if (channel) qs.set("channel", channel);
        if (showGroups) {
          if (groupId) qs.set("group", groupId);
          else qs.delete("group");
        } else {
          const existing = current.get("group");
          if (existing) qs.set("group", existing);
        }
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
          {hasActiveFilters(filters) || hasActiveFilters(local) || (showGroups && groupId) ? (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => {
                setGroupId("");
                router.push(action);
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {showGroups ? (
        <div className="space-y-1.5 rounded-lg border border-navy/15 bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="blast-saved-group" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Saved group
            </label>
            <Link href="/groups" className="text-xs font-medium text-navy underline-offset-2 hover:underline">
              Manage groups
            </Link>
          </div>
          <select
            id="blast-saved-group"
            className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
          >
            <option value="">No group — use filters / picks only</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.memberCount})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {groupId
              ? "Click Update group to apply this list to the blast below."
              : groups.length === 0
                ? "No groups yet. Create one on Groups, then return here."
                : "Choose a group, or leave empty and rely on filters / directory picks."}
          </p>
        </div>
      ) : null}

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
              <span className="text-xs font-normal text-muted-foreground">
                State, city, position, class, career, registered
              </span>
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
              <MultiSelect
                label="Career"
                placeholder="All careers / industries"
                options={facets.careers}
                value={local.careers}
                onChange={(careers) => setLocal((current) => ({ ...current, careers }))}
                searchable
                dropdown
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={local.registered}
                  onChange={(event) => setLocal((current) => ({ ...current, registered: event.target.checked }))}
                  className="size-4 rounded border-input accent-navy"
                />
                Registered
              </label>
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
