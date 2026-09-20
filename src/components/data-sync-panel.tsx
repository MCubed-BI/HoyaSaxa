"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { DataSyncBatch } from "@/lib/data-sync-types";

function formatWhen(value: string | null) {
  if (!value) return "—";
  return formatDateTime(value) ?? value;
}

function statusLabel(status: DataSyncBatch["status"]) {
  if (status === "staged") return "Ready to apply";
  if (status === "applying") return "Applying";
  if (status === "applied") return "Applied";
  return "Failed";
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-muted/80 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-heading text-2xl text-navy sm:text-3xl">{value}</p>
    </div>
  );
}

export function DataSyncPanel({ initialBatches }: { initialBatches: DataSyncBatch[] }) {
  const [batches, setBatches] = useState(initialBatches);
  const [current, setCurrent] = useState<DataSyncBatch | null>(initialBatches[0] ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"upload" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => {
    if (!current || current.row_count === 0) return 0;
    return Math.min(100, Math.round((current.apply_offset / current.row_count) * 100));
  }, [current]);

  function remember(batch: DataSyncBatch) {
    setCurrent(batch);
    setBatches((prev) => [batch, ...prev.filter((item) => item.id !== batch.id)].slice(0, 12));
  }

  async function upload() {
    if (!file) {
      setError("Choose an .xlsx or .csv file first.");
      return;
    }
    setBusy("upload");
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/data-sync", { method: "POST", body: form });
      const data = (await response.json()) as { batch?: DataSyncBatch; error?: string };
      if (!response.ok || !data.batch) {
        throw new Error(data.error || "Upload failed.");
      }
      remember(data.batch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    if (!current) return;
    setBusy("apply");
    setError(null);
    try {
      let batch = current;
      let done = batch.status === "applied";
      while (!done) {
        const response = await fetch(`/api/data-sync/${batch.id}/apply`, { method: "POST" });
        const data = (await response.json()) as { batch?: DataSyncBatch; done?: boolean; error?: string };
        if (!response.ok || !data.batch) {
          throw new Error(data.error || "Apply failed.");
        }
        batch = data.batch;
        remember(batch);
        done = Boolean(data.done) || batch.status === "applied";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply failed.");
      if (current.id) {
        const response = await fetch(`/api/data-sync/${current.id}`);
        const data = (await response.json()) as { batch?: DataSyncBatch };
        if (data.batch) remember(data.batch);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Upload workbook</CardTitle>
          <CardDescription>
            Same mapping as the original import: All Time, Football, Georgetown LinkedIn, sgarlata
            contacts, and 2011–2025 rosters. CSV works when it has those headers or first/last name
            columns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sync-file">Excel or CSV</Label>
            <Input
              id="sync-file"
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : "8 MB limit. Staging stays in data_sync until you apply."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={upload} disabled={busy !== null}>
              {busy === "upload" ? "Reading file…" : "Upload and preview"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {current ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{current.filename}</CardTitle>
                <CardDescription>
                  Staged {formatWhen(current.created_at)}
                  {current.applied_at ? ` · applied ${formatWhen(current.applied_at)}` : ""}
                </CardDescription>
              </div>
              <Badge variant={current.status === "failed" ? "destructive" : current.status === "applied" ? "secondary" : "default"}>
                {statusLabel(current.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="People parsed" value={current.row_count.toLocaleString()} />
              <Stat label="Will update" value={current.update_count.toLocaleString()} />
              <Stat label="Will add" value={current.insert_count.toLocaleString()} />
              <Stat label="Emails" value={current.email_count.toLocaleString()} />
              <Stat label="Phones" value={current.phone_count.toLocaleString()} />
              <Stat label="Roster years" value={current.roster_count.toLocaleString()} />
            </div>

            {current.sheet_counts.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {current.sheet_counts.map((sheet) => (
                  <Badge key={`${sheet.name}-${sheet.kind}`} variant="outline" className="font-normal">
                    {sheet.name.trim()}: {sheet.rows.toLocaleString()}
                  </Badge>
                ))}
              </div>
            ) : null}

            {current.preview.warnings.map((warning) => (
              <p key={warning} className="text-sm text-muted-foreground">
                {warning}
              </p>
            ))}

            <p className="text-sm text-muted-foreground">
              Apply fills blank alumni fields and merges emails, phones, and roster years. After a
              successful apply it also re-fetches public GUHoyas football rosters and headshots into
              <code> football_photo_url</code> (fill empty; update only if the source URL is newer).
              LinkedIn photo fields are not scraped. It does not wipe the live directory. New
              unmatched names are inserted.
            </p>

            {current.status !== "applied" ? (
              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-navy transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {current.apply_offset.toLocaleString()} of {current.row_count.toLocaleString()} applied
                </p>
                <Button type="button" onClick={apply} disabled={busy !== null || current.row_count === 0}>
                  {busy === "apply"
                    ? "Applying to Neon…"
                    : current.status === "failed"
                      ? "Retry apply"
                      : current.apply_offset > 0
                        ? "Continue apply"
                        : "Apply to live alumni"}
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-navy/15 bg-navy/5 px-4 py-3 text-sm">
                Applied {current.applied_update_count.toLocaleString()} updates and{" "}
                {current.applied_insert_count.toLocaleString()} new alumni. Merged{" "}
                {current.applied_email_count.toLocaleString()} emails, {current.applied_phone_count.toLocaleString()}{" "}
                phones, and {current.applied_roster_count.toLocaleString()} roster years.
              </div>
            )}

            {current.errors.length > 0 ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Errors</p>
                {current.errors.map((item) => (
                  <p key={item} className="text-sm text-destructive">
                    {item}
                  </p>
                ))}
              </div>
            ) : null}

            {current.preview.samples.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-navy">Preview sample</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {current.preview.samples.map((sample, index) => (
                      <TableRow key={`${sample.name}-${index}`}>
                        <TableCell className="font-medium">{sample.name}</TableCell>
                        <TableCell>{sample.action === "update" ? "Update" : "Add"}</TableCell>
                        <TableCell>{sample.matchBy ?? "—"}</TableCell>
                        <TableCell className="max-w-[14rem] truncate">{sample.email ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-heading text-xl text-navy">No sync batches yet</p>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Upload the coach workbook to stage a batch in <code>data_sync</code>. Review the
              counts, then apply to the live alumni tables.
            </p>
          </CardContent>
        </Card>
      )}

      {batches.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent batches</CardTitle>
            <CardDescription>Staging history from data_sync. Payloads stay on the server.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => {
                    setCurrent(batch);
                    setError(null);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm ${
                    current?.id === batch.id ? "border-navy/40 bg-navy/5" : "border-transparent hover:bg-muted"
                  }`}
                >
                  <span className="min-w-0 truncate font-medium text-navy">{batch.filename}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {statusLabel(batch.status)} · {batch.row_count.toLocaleString()} people
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
