"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSelection } from "@/components/selection-provider";
import { hasActiveFilters, type AlumniFilters } from "@/lib/filters";
import { displayPhone } from "@/lib/phone";

export type BlastComposerMode = "staff" | "alum";

export type BlastChannel = "sms" | "email";

type Recipient = { id: string; name: string; phone: string | null; email: string | null };
type Preview = {
  count: number;
  withPhone: number;
  withEmail: number;
  missingPhone: number;
  missingEmail: number;
  twilio: boolean;
  emailProvider: "resend" | "sendgrid" | null;
  phoneRecipients: Recipient[];
  emailRecipients: Recipient[];
};

export function BlastComposer({
  filters,
  initialChannel = "sms",
  mode = "staff",
}: {
  filters: AlumniFilters;
  initialChannel?: BlastChannel;
  mode?: BlastComposerMode;
}) {
  const { ids, clear } = useSelection();
  const alumMode = mode === "alum";
  const filtered = hasActiveFilters(filters);
  const [channel, setChannel] = useState<BlastChannel>(alumMode ? "email" : initialChannel);
  const [includeFilters, setIncludeFilters] = useState(filtered);
  const [includeIds, setIncludeIds] = useState(ids.length > 0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "send" | null>(null);
  const [smsFallback, setSmsFallback] = useState<{
    sms: string | { ios: string; android: string; first: string } | null;
  } | null>(null);
  const [emailFallback, setEmailFallback] = useState<{
    mailto: string | null;
    gmail: string | null;
    emails: string[];
  } | null>(null);

  useEffect(() => {
    setChannel(alumMode ? "email" : initialChannel);
  }, [alumMode, initialChannel]);

  useEffect(() => {
    if (filtered) setIncludeFilters(true);
  }, [filtered]);

  useEffect(() => {
    if (ids.length > 0) setIncludeIds(true);
  }, [ids.length]);

  const payload = useMemo(
    () => ({
      filters: alumMode ? { ...filters, q: "" } : filters,
      ids,
      includeFilters: alumMode ? false : includeFilters,
      includeIds: alumMode ? true : includeIds,
      channel: alumMode ? "email" : channel,
    }),
    [alumMode, channel, filters, ids, includeFilters, includeIds],
  );

  async function loadPreview() {
    setBusy("preview");
    setError(null);
    try {
      const response = await fetch("/api/blast/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load recipients");
      setPreview(data as Preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load recipients");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payload)]);

  const readyCount = channel === "sms" ? (preview?.withPhone ?? 0) : (preview?.withEmail ?? 0);
  const list = channel === "sms" ? (preview?.phoneRecipients ?? []) : (preview?.emailRecipients ?? []);
  const providerReady = channel === "sms" ? Boolean(preview?.twilio) : Boolean(preview?.emailProvider);

  async function copy(kind: "phones" | "emails" | "message") {
    if (kind === "message") {
      if (channel === "sms") {
        const phones = preview?.phoneRecipients.map((row) => row.phone).filter(Boolean).join("\n") ?? "";
        await navigator.clipboard.writeText(phones ? `${message}\n\n${phones}` : message);
        setStatus("Copied message and numbers.");
        return;
      }
      const emails = preview?.emailRecipients.map((row) => row.email).filter(Boolean).join(", ") ?? "";
      await navigator.clipboard.writeText(
        [`Subject: ${subject}`, message, emails].filter(Boolean).join("\n\n"),
      );
      setStatus("Copied subject, message, and emails.");
      return;
    }
    const values =
      kind === "phones"
        ? (preview?.phoneRecipients.map((row) => row.phone).filter(Boolean) as string[])
        : (preview?.emailRecipients.map((row) => row.email).filter(Boolean) as string[]);
    if (values.length === 0) {
      setStatus(`No ${kind} in this group.`);
      return;
    }
    await navigator.clipboard.writeText(values.join(kind === "emails" ? ", " : "\n"));
    setStatus(`Copied ${values.length.toLocaleString()} ${kind}.`);
  }

  async function sendBlast() {
    setBusy("send");
    setError(null);
    setStatus(null);
    setSmsFallback(null);
    setEmailFallback(null);
    try {
      const response = await fetch("/api/blast/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, channel, message, subject }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Send failed");
      if (channel === "sms") {
        if (data.mode === "twilio") {
          setStatus(`Sent ${data.sent} of ${data.count} texts${data.failed ? `, ${data.failed} failed` : ""}.`);
        } else {
          setSmsFallback({ sms: data.sms });
          setStatus(`Twilio is not configured. ${data.count} numbers are ready — open Messages or copy the blast.`);
        }
      } else if (data.mode === "resend" || data.mode === "sendgrid") {
        setStatus(`Sent ${data.sent} of ${data.count} emails${data.failed ? `, ${data.failed} failed` : ""}.`);
      } else {
        setEmailFallback({ mailto: data.mailto ?? null, gmail: data.gmail ?? null, emails: data.emails ?? [] });
        setStatus(
          `Email provider is not configured. ${data.count} addresses are ready — open a draft or copy the blast.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recipients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-navy"
              checked={alumMode ? true : includeIds}
              onChange={(event) => setIncludeIds(event.target.checked)}
              disabled={alumMode || ids.length === 0}
            />
            <span>
              {alumMode ? "Directory picks" : "Manual picks"} · {ids.length.toLocaleString()} alumni
              {ids.length === 0 ? (
                <span className="block text-muted-foreground">
                  {alumMode
                    ? "Check names on /directory, then return here to compose."
                    : "Check names on the directory to add people."}
                </span>
              ) : null}
            </span>
          </label>
          {alumMode ? (
            <p className="text-sm text-muted-foreground">
              Alumni email is limited to people you selected. Filter-wide coach blast, Twilio text, and
              Data Sync stay with staff.
            </p>
          ) : (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-navy"
              checked={includeFilters}
              onChange={(event) => setIncludeFilters(event.target.checked)}
            />
            <span>
              Current filter group
              {!filtered ? (
                <span className="block text-muted-foreground">
                  No filters applied. Checking this includes the full directory.
                </span>
              ) : (
                <span className="block text-muted-foreground">Uses the multi-select filters from the URL.</span>
              )}
            </span>
          </label>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">In group</p>
              <p className="font-heading text-3xl text-navy">{(preview?.count ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-muted px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">With email</p>
              <p className="font-heading text-3xl text-navy">{(preview?.withEmail ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-muted px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">With phone</p>
              <p className="font-heading text-3xl text-navy">{(preview?.withPhone ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {alumMode ? null : (
      <div className="flex gap-2">
        <Button type="button" variant={channel === "sms" ? "default" : "outline"} onClick={() => setChannel("sms")}>
          Text
        </Button>
        <Button type="button" variant={channel === "email" ? "default" : "outline"} onClick={() => setChannel("email")}>
          Email
        </Button>
      </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{channel === "sms" ? "Text message" : "Email"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {channel === "email" ? (
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Hoyas alumni update"
                className="bg-card"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            {channel === "email" ? <Label htmlFor="body">Body</Label> : null}
            <Textarea
              id="body"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                channel === "sms"
                  ? "Hoyas — practice moved to 4 p.m. Saturday. — Coach Sgarlata"
                  : "Team,\n\nSharing a quick update from the Hilltop.\n\n— Coach Sgarlata"
              }
              className="min-h-32 bg-card"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {channel === "sms"
              ? `${message.length} characters · SMS segments start at 160`
              : `${readyCount.toLocaleString()} recipients with email`}
          </p>
          {preview ? (
            <p className="text-sm text-muted-foreground">
              {channel === "sms"
                ? preview.twilio
                  ? "Twilio is configured. Send will deliver texts from the app."
                  : "Twilio env is not set. Send prepares the blast and opens Messages / copy."
                : preview.emailProvider
                  ? `${preview.emailProvider === "resend" ? "Resend" : "SendGrid"} is configured. Send uses the same Gmail-ready path as staff (EMAIL_FROM / EMAIL_REPLY_TO).`
                  : "EMAIL_FROM plus RESEND_API_KEY or SENDGRID_API_KEY are not set. Send prepares a Gmail or mailto draft."}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {busy === "preview" ? "Counting recipients…" : "Choose a source to build the list."}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={sendBlast}
              disabled={
                busy !== null ||
                !message.trim() ||
                readyCount === 0 ||
                (channel === "email" && !subject.trim())
              }
            >
              {busy === "send"
                ? "Preparing…"
                : providerReady
                  ? channel === "sms"
                    ? "Send text blast"
                    : "Send email blast"
                  : channel === "sms"
                    ? "Prepare text blast"
                    : "Prepare email blast"}
            </Button>
            {channel === "sms" ? (
              <>
                <Button type="button" variant="outline" onClick={() => copy("phones")} disabled={!preview?.withPhone}>
                  Copy numbers
                </Button>
                <Button type="button" variant="outline" onClick={() => copy("message")} disabled={!message.trim()}>
                  Copy message + numbers
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => copy("emails")} disabled={!preview?.withEmail}>
                  Copy emails
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copy("message")}
                  disabled={!message.trim() && !subject.trim()}
                >
                  Copy subject + body + emails
                </Button>
              </>
            )}
            {ids.length > 0 ? (
              <Button type="button" variant="ghost" onClick={clear}>
                Clear picks
              </Button>
            ) : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
          {channel === "sms" && smsFallback?.sms ? (
            <div className="flex flex-wrap gap-2">
              {typeof smsFallback.sms === "string" ? (
                <Button asChild>
                  <a href={smsFallback.sms}>Open in Messages</a>
                </Button>
              ) : (
                <>
                  <Button asChild>
                    <a href={smsFallback.sms.ios}>Open in Messages (iPhone)</a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={smsFallback.sms.android}>Open in Messages (Android)</a>
                  </Button>
                </>
              )}
            </div>
          ) : null}
          {channel === "email" && emailFallback ? (
            <div className="flex flex-wrap gap-2">
              {emailFallback.gmail ? (
                <Button asChild>
                  <a href={emailFallback.gmail} target="_blank" rel="noreferrer">
                    Open in Gmail
                  </a>
                </Button>
              ) : null}
              {emailFallback.mailto ? (
                <Button asChild variant={emailFallback.gmail ? "outline" : "default"}>
                  <a href={emailFallback.mailto}>Open email draft</a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This group is too large for mailto. Copy the subject, body, and emails instead.
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {list.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {channel === "sms" ? "People who will be texted" : "People who will be emailed"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {list.slice(0, 25).map((row) => (
              <div key={row.id} className="flex items-baseline justify-between gap-3 border-b py-2 last:border-0">
                <p className="truncate font-medium text-navy">{row.name}</p>
                <p className="shrink-0 text-sm text-muted-foreground">
                  {channel === "sms" ? displayPhone(row.phone ?? "") : row.email}
                </p>
              </div>
            ))}
            {list.length > 25 ? (
              <p className="text-sm text-muted-foreground">
                Showing 25 of {list.length.toLocaleString()} with {channel === "sms" ? "phone numbers" : "email"}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
