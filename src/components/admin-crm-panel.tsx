"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Timestamp } from "@/components/timestamp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  channelLabel,
  noteKindLabel,
  truncateSnippet,
  type ContactNote,
  type ContactNoteKind,
  type CrmCommunication,
} from "@/lib/crm";
import { formatCount, formatPhone } from "@/lib/format";

function statusBadgeVariant(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "sent" || normalized === "delivered") return "secondary" as const;
  if (normalized === "failed" || normalized === "bounced") return "destructive" as const;
  return "outline" as const;
}

function destinationLabel(item: CrmCommunication) {
  if (item.channel === "text") return formatPhone(item.destination) || item.destination;
  return item.destination;
}

export function AdminCrmPanel({
  alumniId,
  communications,
  notes,
  donationCallCount,
}: {
  alumniId: string;
  communications: CrmCommunication[];
  notes: ContactNote[];
  donationCallCount: number;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<ContactNoteKind>("donation_call");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submitNote(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/people/${alumniId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, body }),
      });
      const data = (await response.json()) as { note?: ContactNote; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save note.");
      setBody("");
      setMessage(kind === "donation_call" ? "Donation call logged." : "Note saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">CRM · Outreach</CardTitle>
          <p className="text-sm text-muted-foreground">
            Blast texts and emails sent to this contact. Push delivery is not recorded yet.
          </p>
        </CardHeader>
        <CardContent>
          {communications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blast texts or emails on record.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {communications.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="align-top text-muted-foreground">
                      <Timestamp value={item.created_at} prefer="absolute" />
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="outline">{channelLabel(item.channel)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal align-top">
                      {item.subject ? (
                        <p className="font-medium text-foreground">{truncateSnippet(item.subject, 80)}</p>
                      ) : null}
                      <p className="text-muted-foreground">{truncateSnippet(item.body)}</p>
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {destinationLabel(item)}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
                      {item.error ? (
                        <p className="mt-1 max-w-[12rem] whitespace-normal text-xs text-destructive">
                          {truncateSnippet(item.error, 80)}
                        </p>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle className="text-base">CRM · Donation calls & notes</CardTitle>
            <p className="text-sm font-medium text-navy">
              {formatCount(donationCallCount, "donation call")}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Log each manual fundraising call so the team can see how often this contact has been
            reached.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={submitNote} className="space-y-3 rounded-xl border bg-background/60 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`crm-note-kind-${alumniId}`}>Type</Label>
                <select
                  id={`crm-note-kind-${alumniId}`}
                  className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                  value={kind}
                  disabled={pending}
                  onChange={(event) => setKind(event.target.value as ContactNoteKind)}
                >
                  <option value="donation_call">Donation call</option>
                  <option value="note">General note</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`crm-note-body-${alumniId}`}>
                {kind === "donation_call" ? "Call notes" : "Note"}
              </Label>
              <Textarea
                id={`crm-note-body-${alumniId}`}
                value={body}
                disabled={pending}
                onChange={(event) => setBody(event.target.value)}
                placeholder={
                  kind === "donation_call"
                    ? "Outcome, pledge interest, best time to call back…"
                    : "Anything the fundraising team should remember…"
                }
                rows={3}
                required
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={pending || !body.trim()}>
                {pending
                  ? "Saving…"
                  : kind === "donation_call"
                    ? "Log donation call"
                    : "Save note"}
              </Button>
              {message ? <p className="text-sm text-navy">{message}</p> : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </form>

          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No calls or notes logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <li key={note.id} className="border-b border-border/70 pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={note.kind === "donation_call" ? "secondary" : "outline"}>
                      {noteKindLabel(note.kind)}
                    </Badge>
                    <Timestamp
                      value={note.created_at}
                      prefer="absolute"
                      className="text-xs text-muted-foreground"
                    />
                    {note.created_by ? (
                      <span className="text-xs text-muted-foreground">by {note.created_by}</span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
