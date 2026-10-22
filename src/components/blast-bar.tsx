"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminMergeFromSelection } from "@/components/admin-alumni-merge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSelection } from "@/components/selection-provider";
import type { AlumniGroupSummary } from "@/lib/alumni-groups";
import { filtersToSearchParams, hasActiveFilters, type AlumniFilters } from "@/lib/filters";

export function BlastBar({
  filters,
  pageIds,
  totalMatching,
  allowMerge = false,
  pageLabels = {},
}: {
  filters: AlumniFilters;
  pageIds: string[];
  totalMatching: number;
  allowMerge?: boolean;
  pageLabels?: Record<string, string>;
}) {
  const { count, addMany, clear, ids } = useSelection();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [groups, setGroups] = useState<AlumniGroupSummary[]>([]);
  const [targetGroupId, setTargetGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const query = filtersToSearchParams(filters).toString();

  async function refreshGroups() {
    try {
      const response = await fetch("/api/alumni-groups");
      if (!response.ok) return;
      const data = (await response.json()) as { groups?: AlumniGroupSummary[] };
      setGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch {
      // Non-blocking — bar still works for blast picks.
    }
  }

  useEffect(() => {
    void refreshGroups();
  }, []);

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
      setStatus(`Added ${data.ids.length.toLocaleString()} alumni to the blast list.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not add group");
    } finally {
      setBusy(false);
    }
  }

  async function savePicksAsGroup() {
    const name = newGroupName.trim();
    if (!name || ids.length === 0) return;
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/alumni-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, memberIds: ids }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save group");
      const group = data.group as AlumniGroupSummary;
      setNewGroupName("");
      setTargetGroupId(group.id);
      await refreshGroups();
      setStatus(`Saved “${group.name}” with ${group.memberCount.toLocaleString()} alumni.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save group");
    } finally {
      setBusy(false);
    }
  }

  async function addPicksToGroup() {
    if (!targetGroupId || ids.length === 0) return;
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/alumni-groups/${targetGroupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: ids }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add to group");
      await refreshGroups();
      const groupName = groups.find((group) => group.id === targetGroupId)?.name ?? "group";
      setStatus(`Added ${data.added.toLocaleString()} to “${groupName}” (${data.memberCount.toLocaleString()} total).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not add to group");
    } finally {
      setBusy(false);
    }
  }

  const blastHref = `/blast${query ? `?${query}` : ""}`;

  const groupControls =
    count > 0 ? (
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          value={newGroupName}
          onChange={(event) => setNewGroupName(event.target.value)}
          placeholder="New group name"
          className="h-8 max-w-xs bg-white/95 text-navy"
          disabled={busy}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={savePicksAsGroup}
          disabled={busy || !newGroupName.trim()}
        >
          Save as group
        </Button>
        <select
          className="h-8 min-w-[10rem] rounded-lg border border-white/30 bg-white/95 px-2 text-sm text-navy"
          value={targetGroupId}
          onChange={(event) => setTargetGroupId(event.target.value)}
          disabled={busy}
        >
          <option value="">Add to existing…</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name} ({group.memberCount})
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" onClick={addPicksToGroup} disabled={busy || !targetGroupId}>
          Add to group
        </Button>
        <Button asChild type="button" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
          <Link href="/groups">Groups</Link>
        </Button>
      </div>
    ) : null;

  if (count === 0) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => addMany(pageIds)}
          disabled={pageIds.length === 0}
        >
          Add this page to blast
        </Button>
        <Button type="button" variant="outline" onClick={addFilteredGroup} disabled={busy || totalMatching === 0}>
          {busy ? "Adding…" : "Add filtered group"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/groups">Groups</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href={hasActiveFilters(filters) ? blastHref : "/blast"}>Blast</Link>
        </Button>
        {status ? <p className="w-full text-right text-xs text-muted-foreground">{status}</p> : null}
      </div>
    );
  }

  return (
    <div className="sticky bottom-3 z-20 rounded-2xl border border-navy/20 bg-navy px-4 py-3.5 text-white shadow-[var(--shadow-elevated)]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-medium">
              {count.toLocaleString()} selected
              {hasActiveFilters(filters) ? ` · ${totalMatching.toLocaleString()} match filters` : ""}
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
        {groupControls}
        {allowMerge ? <AdminMergeFromSelection labels={pageLabels} /> : null}
      </div>
    </div>
  );
}
