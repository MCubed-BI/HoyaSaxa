"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/multi-select";
import {
  filtersToSearchParams,
  hasActiveFilters,
  type AlumniFilters,
} from "@/lib/filters";
import type { AlumniFacets } from "@/lib/types";

export function AlumniFiltersForm({
  filters,
  facets,
  action = "/",
  submitLabel = "Apply filters",
}: {
  filters: AlumniFilters;
  facets: AlumniFacets;
  action?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState(filters);

  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]"
      onSubmit={(event) => {
        event.preventDefault();
        const next: AlumniFilters = {
          ...local,
          q: local.q.trim(),
        };
        const qs = filtersToSearchParams(next);
        const channel = new URLSearchParams(window.location.search).get("channel");
        if (channel) qs.set("channel", channel);
        const query = qs.toString();
        startTransition(() => {
          router.push(query ? `${action}?${query}` : action);
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="q" className="text-xs uppercase tracking-wide text-muted-foreground">
          Search
        </Label>
        <Input
          id="q"
          name="q"
          value={local.q}
          onChange={(event) => setLocal((current) => ({ ...current, q: event.target.value }))}
          placeholder="Name, company, city, or email"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <MultiSelect
          label="State"
          placeholder="All states"
          options={facets.states}
          value={local.states}
          onChange={(states) => setLocal((current) => ({ ...current, states }))}
        />
        <MultiSelect
          label="City"
          placeholder="All cities"
          options={facets.cities}
          value={local.cities}
          onChange={(cities) => setLocal((current) => ({ ...current, cities }))}
          searchable
        />
        <MultiSelect
          label="Position"
          placeholder="All positions"
          options={facets.positions}
          value={local.positions}
          onChange={(positions) => setLocal((current) => ({ ...current, positions }))}
        />
        <MultiSelect
          label="Class / grad year"
          placeholder="All class years"
          options={facets.classYears}
          value={local.classYears}
          onChange={(classYears) => setLocal((current) => ({ ...current, classYears }))}
        />
        <MultiSelect
          label="Season year"
          placeholder="All seasons"
          options={facets.seasonYears}
          value={local.seasonYears}
          onChange={(seasonYears) => setLocal((current) => ({ ...current, seasonYears }))}
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

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : submitLabel}
        </Button>
        {hasActiveFilters(filters) || hasActiveFilters(local) ? (
          <Button type="button" variant="outline" onClick={() => router.push(action)}>
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  );
}
