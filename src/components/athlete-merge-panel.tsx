"use client";

import { useState } from "react";
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
  const [sourceId, setSourceId] = useState(candidates[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (candidates.length === 0) return null;

  async function merge() {
    if (!sourceId) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/alumni/merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "merge", keeperId, sourceId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Merge failed");
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
        <CardTitle>Likely duplicate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <p className="text-sm text-muted-foreground">
          Another roster or LinkedIn row looks like the same person. Merge keeps emails, phones, and roster years on{" "}
          {keeperName}.
        </p>
        <label className="block text-sm" htmlFor="athlete-merge-source">
          Merge into this profile
          <select
            id="athlete-merge-source"
            className="mt-1 w-full rounded-md border bg-background px-2 py-2"
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
          >
            {candidates.map((row) => (
              <option key={row.id} value={row.id}>
                {displayName(row)}
                {row.class_year ? ` · ${row.class_year}` : ""}
                {row.company_name ? ` · ${row.company_name}` : ""}
                {row.linkedin_url ? " · LinkedIn" : ""}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" disabled={pending || !sourceId} onClick={merge}>
          {pending ? "Merging…" : "Merge duplicate"}
        </Button>
      </CardContent>
    </Card>
  );
}
