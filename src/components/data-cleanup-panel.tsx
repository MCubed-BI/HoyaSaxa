"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/page-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CleanupSuggestion } from "@/lib/data-cleanup";

function PersonCard({
  person,
  role,
}: {
  person: CleanupSuggestion["keeper"];
  role: "Keep" | "Merge away";
}) {
  return (
    <div className="rounded-xl border bg-background px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{role}</p>
      <Link href={`/alumni/${person.id}`} className="mt-1 block font-medium text-navy hover:underline">
        {person.name}
      </Link>
      <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
        {person.classYear ? <li>Class {person.classYear}</li> : null}
        {person.current ? <li>Current · {person.current}</li> : null}
        {person.hometown ? <li>Hometown · {person.hometown}</li> : null}
        {person.company ? <li>{person.company}</li> : null}
        {person.email ? <li>{person.email}</li> : null}
        <li>
          {person.claimed ? "Claimed login" : "Unclaimed"}
          {person.linkedin ? " · LinkedIn" : ""}
        </li>
      </ul>
    </div>
  );
}

export function DataCleanupPanel({ initialSuggestions }: { initialSuggestions: CleanupSuggestion[] }) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busy, setBusy] = useState<"scan" | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "pending" ? suggestions.filter((row) => row.status === "pending") : suggestions),
    [filter, suggestions],
  );

  async function runScan() {
    setBusy("scan");
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/data-cleanup/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ useAi: true }),
      });
      const data = (await response.json()) as {
        error?: string;
        suggestions?: CleanupSuggestion[];
        pairsFound?: number;
        pendingCount?: number;
        aiEnriched?: number;
        aiSkipped?: boolean;
        aiError?: string | null;
      };
      if (!response.ok) throw new Error(data.error ?? "Scan failed");
      setSuggestions(data.suggestions ?? []);
      setFilter("pending");
      const aiBit = data.aiSkipped
        ? data.aiError
          ? ` AI review skipped (${data.aiError}).`
          : " AI review skipped — heuristic suggestions still ready."
        : ` AI reviewed ${data.aiEnriched ?? 0} pair${data.aiEnriched === 1 ? "" : "s"}.`;
      setNotice(
        `Found ${data.pairsFound ?? 0} likely duplicate pair${data.pairsFound === 1 ? "" : "s"}. ${data.pendingCount ?? 0} pending.${aiBit}`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBusy(null);
    }
  }

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id + action);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/data-cleanup/suggestions/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update suggestion");
      setSuggestions((current) =>
        current.map((row) =>
          row.id === id
            ? {
                ...row,
                status: action === "approve" ? "approved" : "rejected",
                decidedAt: new Date().toISOString(),
              }
            : row,
        ),
      );
      setNotice(action === "approve" ? "Merge approved and applied." : "Suggestion rejected.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update suggestion");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">AI duplicate review</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan the roster for likely duplicate alumni, get an AI recommendation, then approve a merge or reject
              the pair. Approving folds the “merge away” row into the keeper in Neon.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={runScan} disabled={busy !== null}>
              {busy === "scan" ? "Scanning…" : "Run AI scan"}
            </Button>
            <Button
              type="button"
              variant={filter === "pending" ? "default" : "outline"}
              onClick={() => setFilter("pending")}
              disabled={busy !== null}
            >
              Pending
            </Button>
            <Button
              type="button"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              disabled={busy !== null}
            >
              All
            </Button>
          </div>
        </CardHeader>
      </Card>

      {notice ? <Notice tone="success">{notice}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {filter === "pending"
              ? "No pending merge suggestions. Run an AI scan to generate recommendations."
              : "No cleanup suggestions yet."}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {visible.map((row) => (
            <li key={row.id}>
              <Card>
                <CardContent className="space-y-4 pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium capitalize text-navy">
                        {row.status} · {row.origin === "ai" ? "AI suggestion" : "Heuristic match"}
                        {row.confidence != null ? ` · ${Math.round(row.confidence * 100)}% confidence` : ""}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{row.aiReason || row.reason}</p>
                    </div>
                    {row.status === "pending" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => decide(row.id, "approve")}
                          disabled={busy !== null}
                        >
                          {busy === `${row.id}approve` ? "Merging…" : "Approve merge"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => decide(row.id, "reject")}
                          disabled={busy !== null}
                        >
                          {busy === `${row.id}reject` ? "Saving…" : "Reject"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <PersonCard person={row.keeper} role="Keep" />
                    <PersonCard person={row.source} role="Merge away" />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
