"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/page-chrome";
import { displayName } from "@/lib/format";
import type { AlumniListItem } from "@/lib/types";

type MergeCandidate = AlumniListItem & { claimed?: boolean; claimed_by_me?: boolean };

export function AthleteMergePanel({
  keeperId,
  keeperName,
  candidates,
}: {
  keeperId: string;
  keeperName: string;
  candidates: MergeCandidate[];
}) {
  const router = useRouter();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const visible = useMemo(
    () => candidates.filter((row) => !hiddenIds.includes(row.id)),
    [candidates, hiddenIds],
  );
  const [sourceId, setSourceId] = useState(candidates[0]?.id ?? "");
  const selectedId = visible.some((row) => row.id === sourceId) ? sourceId : (visible[0]?.id ?? "");
  const [pending, setPending] = useState<"merge" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (visible.length === 0 && !message) return null;

  async function merge() {
    if (!selectedId) return;
    setPending("merge");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/alumni/merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "merge", keeperId, sourceId: selectedId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Merge failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setPending(null);
    }
  }

  async function dismiss() {
    if (!selectedId) return;
    setPending("dismiss");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/alumni/dismiss-duplicate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keeperId, sourceId: selectedId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not dismiss that suggestion.");
      setHiddenIds((current) => [...current, selectedId]);
      setMessage("Got it — we will not suggest that match again.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not dismiss that suggestion.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Likely duplicate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {message ? <Notice tone="success">{message}</Notice> : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other likely duplicates for this profile.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Another roster or LinkedIn row looks like the same person. Merge keeps emails, phones, and roster years on{" "}
              {keeperName}. Not me permanently hides that pair for your login.
            </p>
            <label className="block text-sm" htmlFor="athlete-merge-source">
              Merge into this profile
              <select
                id="athlete-merge-source"
                className="mt-1 w-full rounded-md border bg-background px-2 py-2"
                value={selectedId}
                onChange={(event) => setSourceId(event.target.value)}
              >
                {visible.map((row) => (
                  <option key={row.id} value={row.id}>
                    {displayName(row)}
                    {row.class_year ? ` · ${row.class_year}` : ""}
                    {row.company_name ? ` · ${row.company_name}` : ""}
                    {row.linkedin_url ? " · LinkedIn" : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={pending !== null || !selectedId} onClick={merge}>
                {pending === "merge" ? "Merging…" : "Merge duplicate"}
              </Button>
              <Button type="button" variant="outline" disabled={pending !== null || !selectedId} onClick={dismiss}>
                {pending === "dismiss" ? "Saving…" : "Not me"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
