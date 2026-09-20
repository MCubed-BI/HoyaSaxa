"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HoyaBadgeRow } from "@/components/hoya-badges";
import { Kpi, KpiGrid } from "@/components/kpi";
import { Notice } from "@/components/page-chrome";
import { Timestamp } from "@/components/timestamp";
import type { PublicBadge } from "@/lib/badges";
import { displayName, formatCount } from "@/lib/format";
import type { AlumniDetail, AlumniListItem } from "@/lib/types";

type MergeCandidate = AlumniListItem & { claimed: boolean; claimed_by_me: boolean };

export function AlumniMePanel({
  email,
  records,
  mergeCandidates,
  badgesById = {},
}: {
  email: string;
  records: AlumniDetail[];
  mergeCandidates: MergeCandidate[];
  badgesById?: Record<string, PublicBadge[]>;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(records[0]?.id ?? "");
  const active = useMemo(() => records.find((row) => row.id === activeId) ?? records[0], [activeId, records]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState(mergeCandidates[0]?.id ?? "");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    const form = new FormData(event.currentTarget);
    const patch = Object.fromEntries(
      [
        "first_name",
        "preferred_name",
        "email_primary",
        "phone_primary",
        "current_city",
        "current_state",
        "company_name",
        "job_title",
        "industry",
        "linkedin_url",
        "headline",
        "address_primary",
      ].map((key) => [key, String(form.get(key) ?? "")]),
    );
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/alumni/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alumniId: active.id, patch }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Save failed");
      const photos = await fetch("/api/alum/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          alumniId: active.id,
          football_photo_url: String(form.get("football_photo_url") ?? ""),
          linkedin_photo_url: String(form.get("linkedin_photo_url") ?? ""),
        }),
      });
      const photoData = (await photos.json()) as { error?: string };
      if (!photos.ok) throw new Error(photoData.error ?? "Save failed");
      setMessage("Saved your record.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function runMerge(action: "claim" | "merge") {
    if (!active || !sourceId) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/alumni/merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          action === "claim"
            ? { action: "claim", alumniId: sourceId }
            : { action: "merge", keeperId: active.id, sourceId },
        ),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Merge failed");
      setMessage(action === "claim" ? "Added that roster row to your login." : "Merged the duplicate into this record.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setPending(false);
    }
  }

  if (!active) {
    return <p className="text-sm text-muted-foreground">No claimed records yet. Register yourself from the roster lookup.</p>;
  }

  return (
    <div className="space-y-5">
      <KpiGrid>
        <Kpi
          tone="primary"
          icon="profile"
          label="Signed in as"
          value={<span className="block truncate text-xl sm:text-2xl">{email}</span>}
          hint={
            active.updated_at ? (
              <>
                Last saved <Timestamp value={active.updated_at} />
              </>
            ) : null
          }
        />
        <Kpi
          tone="secondary"
          icon="directory"
          label="Claimed records"
          value={formatCount(records.length, "card")}
          hint={active.class_year ? `Editing class of ${active.class_year}` : "Roster class stays on the player card"}
        />
        <Kpi
          tone={mergeCandidates.length > 0 ? "alert" : "secondary"}
          icon={mergeCandidates.length > 0 ? "alert" : "empty"}
          label="Possible duplicates"
          value={formatCount(mergeCandidates.length, "row")}
          hint={mergeCandidates.length > 0 ? "Same last name — claim or merge below" : "No other unclaimed rows"}
        />
      </KpiGrid>

      <HoyaBadgeRow badges={badgesById[active.id] ?? []} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        {records.length > 1 ? (
          <label className="text-sm">
            Editing
            <select
              className="ml-2 rounded-md border bg-background px-2 py-1"
              value={active.id}
              onChange={(event) => setActiveId(event.target.value)}
            >
              {records.map((row) => (
                <option key={row.id} value={row.id}>
                  {displayName(row)} {row.class_year ? `· ${row.class_year}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Card>
        <CardHeader>
          <CardTitle>Edit my record</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" name="first_name" defaultValue={active.first_name} />
            <Field label="Preferred name" name="preferred_name" defaultValue={active.preferred_name} />
            <Field label="Email" name="email_primary" defaultValue={active.email_primary} />
            <Field label="Phone" name="phone_primary" defaultValue={active.phone_primary} />
            <Field label="Current city" name="current_city" defaultValue={active.current_city} />
            <Field label="Current state" name="current_state" defaultValue={active.current_state} />
            <Field label="Company" name="company_name" defaultValue={active.company_name} />
            <Field label="Title" name="job_title" defaultValue={active.job_title} />
            <Field label="Industry" name="industry" defaultValue={active.industry} />
            <Field label="LinkedIn" name="linkedin_url" defaultValue={active.linkedin_url} />
            <Field label="Football roster photo URL" name="football_photo_url" defaultValue={active.football_photo_url} />
            <Field label="Current LinkedIn / headshot URL" name="linkedin_photo_url" defaultValue={active.linkedin_photo_url} />
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="headline">Headline</Label>
              <Input id="headline" name="headline" defaultValue={active.headline ?? ""} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address_primary">Address</Label>
              <Textarea id="address_primary" name="address_primary" defaultValue={active.address_primary ?? ""} />
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              Roster last name and graduating class stay on the player card ({active.last_name}
              {active.class_year ? ` · ${active.class_year}` : ""}). Contact the staff to change those.
            </p>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save my record"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Merge accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mergeCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No other unclaimed {active.last_name} rows are available to merge.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Duplicate roster rows with the same last name can be claimed or folded into {displayName(active)}.
              </p>
              <label className="block text-sm">
                Other {active.last_name} row
                <select
                  className="mt-1 w-full rounded-md border bg-background px-2 py-2"
                  value={sourceId}
                  onChange={(event) => setSourceId(event.target.value)}
                >
                  {mergeCandidates.map((row) => (
                    <option key={row.id} value={row.id}>
                      {displayName(row)}
                      {row.class_year ? ` · ${row.class_year}` : " · no class year"}
                      {row.company_name ? ` · ${row.company_name}` : ""}
                      {row.claimed_by_me ? " · already on this login" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={pending} onClick={() => runMerge("claim")}>
                  Claim this row
                </Button>
                <Button type="button" disabled={pending} onClick={() => runMerge("merge")}>
                  Merge into {displayName(active)}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue ?? ""} />
    </div>
  );
}
