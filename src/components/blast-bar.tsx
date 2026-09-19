"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSelection } from "@/components/selection-provider";
import { filtersToSearchParams, hasActiveFilters, type AlumniFilters } from "@/lib/filters";
import { formatNumber } from "@/lib/format";

export function BlastBar({
  filters,
  pageIds,
  totalMatching,
}: {
  filters: AlumniFilters;
  pageIds: string[];
  totalMatching: number;
}) {
  const { count, addMany, clear, ids } = useSelection();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const query = filtersToSearchParams(filters).toString();

  async function addFilteredGroup() {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/blast/ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters, includeFilters: true, includeIds: false }),
      });
      if (!response.ok) throw new Error("Could not add this group");
      const data = (await response.json()) as { ids: string[] };
      addMany(data.ids ?? []);
      setStatus(`Added ${formatNumber(data.ids.length)} alumni to the blast list.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not add group");
    } finally {
      setBusy(false);
    }
  }

  const blastHref = `/blast${query ? `?${query}` : ""}`;

  return (
    <div className="sticky bottom-3 z-20 rounded-2xl border border-navy/20 bg-navy px-4 py-3.5 text-white shadow-[var(--shadow-elevated)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium">
            {formatNumber(count)} selected
            {hasActiveFilters(filters) ? ` · ${formatNumber(totalMatching)} match filters` : ""}
          </p>
          {status ? <p className="mt-1 text-white/70">{status}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => addMany(pageIds)}
            disabled={pageIds.length === 0}
          >
            Add this page
          </Button>
          <Button type="button" variant="secondary" onClick={addFilteredGroup} disabled={busy || totalMatching === 0}>
            {busy ? "Adding…" : "Add filtered group"}
          </Button>
          {count > 0 ? (
            <Button type="button" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={clear}>
              Clear picks
            </Button>
          ) : null}
          <Button asChild>
            <Link href={count > 0 || hasActiveFilters(filters) ? blastHref : "/blast"} className="bg-white text-navy hover:bg-white/90">
              Blast{count > 0 ? ` (${ids.length})` : ""}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
