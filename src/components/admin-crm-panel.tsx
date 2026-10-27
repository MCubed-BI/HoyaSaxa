"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CrmNote, CrmOutreachChannel, CrmOutreachItem, CrmSnapshot } from "@/lib/crm";

function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function channelLabel(channel: CrmOutreachChannel) {
  if (channel === "sms") return "Text";
  if (channel === "email") return "Email";
  return "Push";
}

function statusTone(status: string) {
  const raw = status.toLowerCase();
  if (raw === "sent") return "text-navy";
  if (raw === "failed" || raw === "error") return "text-destructive";
  return "text-muted-foreground";
}

function toDatetimeLocalValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function AdminCrmPanel({
  alumniId,
  personName,
  initialCrm,
}: {
  alumniId: string;
  personName: string;
  initialCrm: CrmSnapshot;
}) {
  const [crm, setCrm] = useState(initialCrm);
  const [channelFilter, setChannelFilter] = useState<"all" | CrmOutreachChannel>("all");
  const [noteBody, setNoteBody] = useState("");
  const [callNote, setCallNote] = useState("");
  const [calledAt, setCalledAt] = useState(toDatetimeLocalValue());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const outreach = useMemo(() => {
    if (channelFilter === "all") return crm.outreach;
    return crm.outreach.filter((item) => item.channel === channelFilter);
  }, [channelFilter, crm.outreach]);

  const donationNotes = useMemo(
    () => crm.notes.filter((note) => note.kind === "donation_call"),
    [crm.notes],
  );
  const generalNotes = useMemo(() => crm.notes.filter((note) => note.kind === "note"), [crm.notes]);

  async function refresh() {
    const response = await fetch(`/api/admin/crm/${alumniId}`);
    const data = (await response.json()) as { crm?: CrmSnapshot; error?: string };
    if (!response.ok) throw new Error(data.error || "Could not refresh CRM.");
    if (data.crm) setCrm(data.crm);
  }

  async function postNote(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/crm/${alumniId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { crm?: CrmSnapshot; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save.");
      if (data.crm) setCrm(data.crm);
      else await refresh();
      setMessage(body.kind === "donation_call" ? "Donation call logged." : "Note saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function onLogCall(event: React.FormEvent) {
    event.preventDefault();
    const iso = calledAt ? new Date(calledAt).toISOString() : new Date().toISOString();
    await postNote({
      kind: "donation_call",
      body: callNote.trim() || "Donation call",
      calledAt: iso,
    });
    setCallNote("");
    setCalledAt(toDatetimeLocalValue());
  }

  async function onSaveNote(event: React.FormEvent) {
    event.preventDefault();
    await postNote({ kind: "note", body: noteBody });
    setNoteBody("");
  }

  async function onDelete(note: CrmNote) {
    if (!window.confirm("Delete this CRM entry?")) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/crm/${alumniId}/notes`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ noteId: note.id }),
      });
      const data = (await response.json()) as { crm?: CrmSnapshot; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not delete.");
      if (data.crm) setCrm(data.crm);
      setMessage("Deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="crm" className="space-y-5 rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin CRM</p>
          <h3 className="font-heading text-xl text-navy">Outreach & donation calls</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Blast history and fundraising call notes for {personName}.
          </p>
        </div>
        <div className="rounded-lg border bg-background px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Donation calls</p>
          <p className="font-heading text-3xl text-navy">{crm.donationCallCount}</p>
        </div>
      </div>

      {message ? <p className="text-sm text-navy">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={onLogCall} className="space-y-3 rounded-lg border bg-background p-4">
          <div>
            <h4 className="font-medium text-navy">Log donation call</h4>
            <p className="text-xs text-muted-foreground">
              Manual phone asks for a gift. Counts toward the total above.
            </p>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Called at (ET)
            </span>
            <input
              type="datetime-local"
              className="h-10 w-full rounded-lg border border-input bg-card px-3"
              value={calledAt}
              onChange={(event) => setCalledAt(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Call note
            </span>
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-input bg-card px-3 py-2"
              value={callNote}
              onChange={(event) => setCallNote(event.target.value)}
              placeholder="Left voicemail · pledged · not interested…"
            />
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Log donation call"}
          </Button>
        </form>

        <form onSubmit={onSaveNote} className="space-y-3 rounded-lg border bg-background p-4">
          <div>
            <h4 className="font-medium text-navy">Staff note</h4>
            <p className="text-xs text-muted-foreground">General CRM notes (not counted as calls).</p>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Note</span>
            <textarea
              required
              className="min-h-[88px] w-full rounded-lg border border-input bg-card px-3 py-2"
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Context for the next outreach…"
            />
          </label>
          <Button type="submit" variant="outline" disabled={busy || !noteBody.trim()}>
            {busy ? "Saving…" : "Save note"}
          </Button>
        </form>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-medium text-navy">Blast & notifications</h4>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "All"],
                ["sms", "Text"],
                ["email", "Email"],
                ["push", "Push"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={channelFilter === id ? "default" : "outline"}
                onClick={() => setChannelFilter(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        {outreach.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
            {channelFilter === "push"
              ? "No push notifications yet. When push blasts are sent, they will show here."
              : channelFilter === "all"
                ? "No text, email, or push blasts have been sent to this person yet."
                : `No ${channelLabel(channelFilter).toLowerCase()} blasts on file for this person.`}
          </p>
        ) : (
          <ul className="space-y-2">
            {outreach.map((item) => (
              <OutreachRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <NoteList
          title="Donation call log"
          empty="No donation calls logged yet."
          notes={donationNotes}
          busy={busy}
          onDelete={onDelete}
          showCalledAt
        />
        <NoteList
          title="Notes"
          empty="No staff notes yet."
          notes={generalNotes}
          busy={busy}
          onDelete={onDelete}
        />
      </div>
    </section>
  );
}

function OutreachRow({ item }: { item: CrmOutreachItem }) {
  return (
    <li className="rounded-lg border bg-background px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="rounded-md bg-navy/10 px-1.5 py-0.5 font-semibold text-navy">
          {channelLabel(item.channel)}
        </span>
        <span className={statusTone(item.status)}>{item.status}</span>
        {item.provider ? <span>{item.provider}</span> : null}
        <span className="ml-auto normal-case tracking-normal">{formatWhen(item.sentAt)} ET</span>
      </div>
      {item.subject ? <p className="mt-2 text-sm font-medium text-navy">{item.subject}</p> : null}
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{item.body}</p>
      {item.address ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">To {item.address}</p>
      ) : null}
      {item.error ? <p className="mt-1 text-xs text-destructive">{item.error}</p> : null}
    </li>
  );
}

function NoteList({
  title,
  empty,
  notes,
  busy,
  onDelete,
  showCalledAt,
}: {
  title: string;
  empty: string;
  notes: CrmNote[];
  busy: boolean;
  onDelete: (note: CrmNote) => void;
  showCalledAt?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-navy">{title}</h4>
      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border bg-background px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {showCalledAt ? `Called ${formatWhen(note.calledAt)} ET` : formatWhen(note.createdAt)}
                    {note.createdBy ? ` · ${note.createdBy}` : ""}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onDelete(note)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
