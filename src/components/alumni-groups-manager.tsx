"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSelection } from "@/components/selection-provider";
import type { AlumniGroupMember, AlumniGroupSummary } from "@/lib/alumni-groups";

type GroupDetail = {
  group: AlumniGroupSummary;
  members: AlumniGroupMember[];
};

export function AlumniGroupsManager({ initialGroups }: { initialGroups: AlumniGroupSummary[] }) {
  const { ids, addMany, clear } = useSelection();
  const [groups, setGroups] = useState(initialGroups);
  const [selectedId, setSelectedId] = useState(initialGroups[0]?.id ?? "");
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [newName, setNewName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => groups.find((group) => group.id === selectedId) ?? null,
    [groups, selectedId],
  );

  async function refreshGroups(preferId?: string) {
    const response = await fetch("/api/alumni-groups");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not refresh groups");
    const next = (data.groups ?? []) as AlumniGroupSummary[];
    setGroups(next);
    const nextId = preferId && next.some((group) => group.id === preferId) ? preferId : next[0]?.id ?? "";
    setSelectedId(nextId);
    return next;
  }

  async function loadDetail(groupId: string) {
    if (!groupId) {
      setDetail(null);
      return;
    }
    const response = await fetch(`/api/alumni-groups/${groupId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load group");
    setDetail({ group: data.group, members: data.members ?? [] });
    setRenameValue(data.group.name);
  }

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/alumni-groups/${selectedId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load group");
        if (cancelled) return;
        setDetail({ group: data.group, members: data.members ?? [] });
        setRenameValue(data.group.name);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load group");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function selectGroup(groupId: string) {
    setSelectedId(groupId);
    setError(null);
    setStatus(null);
  }

  async function createGroup() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/alumni-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, memberIds: ids }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create group");
      setNewName("");
      await refreshGroups(data.group.id);
      setStatus(
        ids.length
          ? `Created “${data.group.name}” with ${data.group.memberCount.toLocaleString()} selected alumni.`
          : `Created empty group “${data.group.name}”.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create group");
    } finally {
      setBusy(false);
    }
  }

  async function renameGroup() {
    if (!selectedId || !renameValue.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/alumni-groups/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not rename");
      await refreshGroups(selectedId);
      setStatus(`Renamed to “${data.group.name}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename");
    } finally {
      setBusy(false);
    }
  }

  async function deleteGroup() {
    if (!selectedId || !selected) return;
    if (!window.confirm(`Delete group “${selected.name}”? Members are removed from the list only.`)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/alumni-groups/${selectedId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete");
      await refreshGroups();
      setDetail(null);
      setStatus(`Deleted “${selected.name}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  async function addPicksToSelected() {
    if (!selectedId || ids.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/alumni-groups/${selectedId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: ids }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add members");
      await refreshGroups(selectedId);
      await loadDetail(selectedId);
      setStatus(`Added ${data.added.toLocaleString()} alumni (${data.memberCount.toLocaleString()} total).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add members");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(alumniId: string) {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/alumni-groups/${selectedId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: [alumniId] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove member");
      await refreshGroups(selectedId);
      await loadDetail(selectedId);
      setStatus(`Removed member (${data.memberCount.toLocaleString()} remaining).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove member");
    } finally {
      setBusy(false);
    }
  }

  function loadGroupIntoBlast() {
    if (!detail?.members.length) return;
    addMany(detail.members.map((member) => member.alumniId));
    setStatus(`Loaded ${detail.members.length.toLocaleString()} members into blast picks.`);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="New group name"
              className="bg-card"
              disabled={busy}
            />
            <Button type="button" className="w-full" onClick={createGroup} disabled={busy || !newName.trim()}>
              {ids.length > 0 ? `Create with ${ids.length} picks` : "Create empty group"}
            </Button>
          </div>
          <ul className="divide-y rounded-lg border">
            {groups.length === 0 ? (
              <li className="px-3 py-4 text-sm text-muted-foreground">No groups yet.</li>
            ) : (
              groups.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    className={`flex w-full items-baseline justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/60 ${
                      group.id === selectedId ? "bg-muted font-medium text-navy" : ""
                    }`}
                    onClick={() => void selectGroup(group.id)}
                  >
                    <span className="truncate">{group.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{group.memberCount}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{selected?.name ?? "Group detail"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Create a group to start adding alumni.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  className="max-w-xs bg-card"
                  disabled={busy}
                />
                <Button type="button" variant="outline" onClick={renameGroup} disabled={busy || !renameValue.trim()}>
                  Rename
                </Button>
                <Button type="button" variant="outline" onClick={addPicksToSelected} disabled={busy || ids.length === 0}>
                  Add {ids.length || ""} picks
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadGroupIntoBlast}
                  disabled={busy || !detail?.members.length}
                >
                  Load into blast picks
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href={`/blast?group=${selectedId}`}>Blast this group</Link>
                </Button>
                <Button type="button" variant="ghost" onClick={deleteGroup} disabled={busy}>
                  Delete
                </Button>
                {ids.length > 0 ? (
                  <Button type="button" variant="ghost" onClick={clear}>
                    Clear picks
                  </Button>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {(detail?.members.length ?? selected.memberCount).toLocaleString()} members
                {ids.length ? ` · ${ids.length.toLocaleString()} directory picks ready to add` : ""}
              </p>
              <ul className="divide-y rounded-lg border">
                {(detail?.members ?? []).map((member) => (
                  <li key={member.alumniId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <Link href={`/alumni/${member.alumniId}`} className="truncate font-medium text-navy hover:underline">
                      {member.name}
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void removeMember(member.alumniId)}
                      disabled={busy}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
                {detail && detail.members.length === 0 ? (
                  <li className="px-3 py-4 text-sm text-muted-foreground">
                    No members yet. Select alumni on the directory, then Add picks.
                  </li>
                ) : null}
              </ul>
            </>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
