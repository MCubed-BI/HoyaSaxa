"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DirectoryNameSearch } from "@/components/directory-name-search";
import { Notice } from "@/components/page-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOptionalSelection, useSelection } from "@/components/selection-provider";
import type { DirectoryPersonSuggestion } from "@/lib/directory-search";

type Pick = { id: string; label: string };

export function AdminMergeFromSelection({ labels = {} }: { labels?: Record<string, string> }) {
  const router = useRouter();
  const { ids, replaceAfterMerge } = useSelection();
  const selected = useMemo(() => [...ids], [ids]);
  const [keeperId, setKeeperId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (selected.length < 2) return null;

  const keeper = keeperId && selected.includes(keeperId) ? keeperId : selected[0]!;
  const sources = selected.filter((id) => id !== keeper);
  const labelFor = (id: string) => labels[id] || `${id.slice(0, 8)}…`;

  async function mergeSelected() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      for (const sourceId of sources) {
        const response = await fetch("/api/alumni/merge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "merge", keeperId: keeper, sourceId }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Merge failed");
        replaceAfterMerge(sourceId, keeper);
      }
      setMessage(`Merged ${sources.length} record${sources.length === 1 ? "" : "s"} into ${labelFor(keeper)}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-white/25 bg-white/10 p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <p className="text-sm text-white/90">
        Admin merge · keep{" "}
        <select
          className="mx-1 max-w-[14rem] rounded border border-white/30 bg-white/95 px-2 py-1 text-sm text-navy"
          value={keeper}
          onChange={(event) => setKeeperId(event.target.value)}
          disabled={pending}
        >
          {selected.map((id) => (
            <option key={id} value={id}>
              {labelFor(id)}
            </option>
          ))}
        </select>
        · fold {sources.length} other{sources.length === 1 ? "" : "s"} into it
      </p>
      <Button type="button" variant="secondary" disabled={pending} onClick={mergeSelected}>
        {pending ? "Merging…" : "Merge selected"}
      </Button>
      {error ? <p className="w-full text-sm text-red-200">{error}</p> : null}
      {message ? <p className="w-full text-sm text-white/80">{message}</p> : null}
    </div>
  );
}

export function AdminAlumniMergeCard() {
  const router = useRouter();
  const selection = useOptionalSelection();
  const [keeper, setKeeper] = useState<Pick | null>(null);
  const [source, setSource] = useState<Pick | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function pickKeeper(hit: DirectoryPersonSuggestion) {
    setKeeper({ id: hit.id, label: hit.name });
  }

  function pickSource(hit: DirectoryPersonSuggestion) {
    setSource({ id: hit.id, label: hit.name });
  }

  async function merge() {
    if (!keeper || !source || keeper.id === source.id) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/alumni/merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "merge", keeperId: keeper.id, sourceId: source.id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Merge failed");
      selection?.replaceAfterMerge(source.id, keeper.id);
      setMessage(`Merged ${source.label} into ${keeper.label}.`);
      setSource(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Admin · merge alumni</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Fold a duplicate roster row into the keeper. Emails, phones, roster years, groups, badges, and
          check-ins move onto the person you keep; the source row is deleted.
        </p>
        {message ? <Notice tone="success">{message}</Notice> : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Keep this person</p>
            <DirectoryNameSearch
              view="admin"
              openProfileOnSelect={false}
              onSelect={pickKeeper}
              placeholder="Search keeper"
              label="Keeper"
            />
            {keeper ? <p className="text-sm text-navy">{keeper.label}</p> : null}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Merge away (duplicate)</p>
            <DirectoryNameSearch
              view="admin"
              openProfileOnSelect={false}
              onSelect={pickSource}
              placeholder="Search duplicate"
              label="Duplicate"
            />
            {source ? <p className="text-sm text-navy">{source.label}</p> : null}
          </div>
        </div>
        <Button
          type="button"
          disabled={pending || !keeper || !source || keeper.id === source.id}
          onClick={merge}
        >
          {pending ? "Merging…" : "Merge into keeper"}
        </Button>
      </CardContent>
    </Card>
  );
}
