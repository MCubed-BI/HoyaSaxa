"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSelection } from "@/components/selection-provider";
import type { AlumniGroupSummary } from "@/lib/alumni-groups";
import { hasActiveFilters, type AlumniFilters } from "@/lib/filters";
import { displayPhone } from "@/lib/phone";

export type BlastComposerMode = "staff" | "alum";

export type BlastChannel = "sms" | "email";

type Recipient = {
  id: string;
  name: string;
  phone: string | null;
  phoneLabel?: string | null;
  phoneKind?: string | null;
  email: string | null;
};
type Preview = {
  count: number;
  withPhone: number;
  withLandline?: number;
  withEmail: number;
  missingPhone: number;
  missingEmail: number;
  twilio: boolean;
  twilioA2pReady?: boolean;
  emailProvider: "gmail" | "resend" | "sendgrid" | null;
  emailFrom?: string | null;
  phoneRecipients: Recipient[];
  landlineRecipients?: Recipient[];
  emailRecipients: Recipient[];
};

export function BlastComposer({
  filters,
  initialChannel = "sms",
  mode = "staff",
  initialGroups = [],
  initialGroupId = "",
}: {
  filters: AlumniFilters;
  initialChannel?: BlastChannel;
  mode?: BlastComposerMode;
  initialGroups?: AlumniGroupSummary[];
  initialGroupId?: string;
}) {
  const { ids, clear } = useSelection();
  const alumMode = mode === "alum";
  const filtered = hasActiveFilters(filters);
  const hasInitialGroup = Boolean(initialGroupId && initialGroups.some((group) => group.id === initialGroupId));
  const [channel, setChannel] = useState<BlastChannel>(alumMode ? "email" : initialChannel);
  // When opening with ?group=, don't also pull the full directory via filters.
  const [includeFilters, setIncludeFilters] = useState(filtered && !hasInitialGroup);
  const [includeIds, setIncludeIds] = useState(ids.length > 0);
  const [groups, setGroups] = useState<AlumniGroupSummary[]>(initialGroups);
  const [selectedGroupId, setSelectedGroupId] = useState(hasInitialGroup ? initialGroupId : "");
  const [includeGroups, setIncludeGroups] = useState(hasInitialGroup);
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
    if (filtered && !selectedGroupId) setIncludeFilters(true);
  }, [filtered, selectedGroupId]);

  useEffect(() => {
    if (ids.length > 0) setIncludeIds(true);
  }, [ids.length]);

  useEffect(() => {
    if (alumMode) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/alumni-groups");
        if (!response.ok) return;
        const data = (await response.json()) as { groups?: AlumniGroupSummary[] };
        if (!cancelled && Array.isArray(data.groups)) setGroups(data.groups);
      } catch {
        // Keep server-provided list if refresh fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [alumMode]);

  useEffect(() => {
    if (selectedGroupId && !groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId("");
      setIncludeGroups(false);
    }
  }, [groups, selectedGroupId]);

  function chooseGroup(nextId: string) {
    setSelectedGroupId(nextId);
    setIncludeGroups(Boolean(nextId));
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (nextId) url.searchParams.set("group", nextId);
    else url.searchParams.delete("group");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }

  const payload = useMemo(() => {
    const groupIds = !alumMode && selectedGroupId ? [selectedGroupId] : [];
    return {
      filters: alumMode ? { ...filters, q: "" } : filters,
      ids,
      groupIds,
      includeFilters: alumMode ? false : includeFilters,
      includeIds: alumMode ? true : includeIds,
      includeGroups: alumMode ? false : includeGroups && groupIds.length > 0,
      channel: alumMode ? "email" : channel,
    };
  }, [alumMode, channel, filters, ids, includeFilters, includeGroups, includeIds, selectedGroupId]);

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
  const providerReady =
    channel === "sms"
      ? Boolean(preview?.twilio && preview?.twilioA2pReady !== false)
      : Boolean(preview?.emailProvider);
  const a2pBlocked = channel === "sms" && Boolean(preview?.twilio) && preview?.twilioA2pReady === false;
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;

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
        const skipped =
          typeof data.skippedLandlines === "number" && data.skippedLandlines > 0
            ? `, skipped ${data.skippedLandlines} office/landline`
            : "";
        if (data.mode === "twilio") {
          const failedDetail =
            Array.isArray(data.results) && data.failed
              ? data.results
                  .filter((row: { status?: string; error?: string }) => row.status === "failed")
                  .slice(0, 3)
                  .map((row: { name?: string; error?: string }) =>
                    row.error ? `${row.name}: ${row.error}` : row.name,
                  )
                  .filter(Boolean)
                  .join(" · ")
              : "";
          setStatus(
            [
              `Delivered/accepted ${data.sent} of ${data.count}`,
              data.failed ? `${data.failed} failed` : null,
              data.queued ? `${data.queued} still sending` : null,
              skipped.replace(/^, /, "") || null,
            ]
              .filter(Boolean)
              .join(", ") +
              "." +
              (failedDetail ? ` ${failedDetail}` : ""),
          );
        } else {
          setSmsFallback({ sms: data.sms });
          setStatus(
            `Twilio is not configured. ${data.count} mobile numbers are ready — open Messages or copy the blast${skipped}.`,
          );
        }
      } else if (data.mode === "gmail" || data.mode === "resend" || data.mode === "sendgrid") {
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
            <>
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
              <div className="space-y-2 rounded-lg border border-navy/20 bg-muted/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-navy">Saved group</p>
                    <p className="text-xs text-muted-foreground">
                      Pick a group to blast. Combine with picks or filters if you want.
                    </p>
                  </div>
                  <Button asChild type="button" size="sm" variant="outline">
                    <Link href="/groups">Manage</Link>
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-10 min-w-[14rem] flex-1 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring"
                    value={selectedGroupId}
                    onChange={(event) => chooseGroup(event.target.value)}
                    aria-label="Select blast group"
                  >
                    <option value="">Select a group…</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.memberCount})
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-navy"
                      checked={includeGroups}
                      onChange={(event) => setIncludeGroups(event.target.checked)}
                      disabled={!selectedGroupId}
                    />
                    Include group
                  </label>
                </div>
                {selectedGroup ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedGroup.name} · {selectedGroup.memberCount.toLocaleString()} members
                    {includeGroups ? " · included in this blast" : " · check Include group to send"}
                  </p>
                ) : groups.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No saved groups yet. Create one on Groups, or save directory picks as a group.
                  </p>
                ) : null}
              </div>
            </>
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
              <p className="text-xs uppercase tracking-wide text-muted-foreground">SMS-ready</p>
              <p className="font-heading text-3xl text-navy">{(preview?.withPhone ?? 0).toLocaleString()}</p>
            </div>
          </div>
          {preview && (preview.withLandline ?? 0) > 0 ? (
            <p className="text-sm text-muted-foreground">
              Skipping {(preview.withLandline ?? 0).toLocaleString()} office/landline number
              {(preview.withLandline ?? 0) === 1 ? "" : "s"} (Work labels or campus exchanges). Texts go to
              Mobile when one is on file.
            </p>
          ) : null}
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
                ? a2pBlocked
                  ? "Twilio credentials are present, but TWILIO_MESSAGING_SERVICE_SID is missing. US carriers reject From-only 10DLC texts (error 30034). Add an approved A2P Messaging Service SID on Vercel before Send will work."
                  : preview.twilio
                    ? "Twilio Messaging Service is configured. Send will deliver texts from the app."
                    : "Twilio is not fully configured (need Account SID + Auth Token or API Key, plus Messaging Service or From). Send prepares Messages / copy instead."
                : preview.emailProvider === "gmail"
                  ? `Send will deliver from ${preview.emailFrom || "GMAIL_USER"} via Gmail SMTP.`
                  : preview.emailProvider
                    ? `${preview.emailProvider === "resend" ? "Resend" : "SendGrid"} is configured as a leftover fallback.`
                    : "GMAIL_USER + GMAIL_APP_PASSWORD are not set. Send prepares a Gmail or mailto draft."}
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
                  {channel === "sms"
                    ? `${displayPhone(row.phone ?? "")}${row.phoneLabel ? ` · ${row.phoneLabel}` : ""}`
                    : row.email}
                </p>
              </div>
            ))}
            {list.length > 25 ? (
              <p className="text-sm text-muted-foreground">
                Showing 25 of {list.length.toLocaleString()} with {channel === "sms" ? "mobile numbers" : "email"}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {channel === "sms" && (preview?.landlineRecipients?.length ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skipped — office / landline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              These numbers usually cannot receive texts. Add a Mobile number on the person record to include
              them next time.
            </p>
            {(preview?.landlineRecipients ?? []).slice(0, 25).map((row) => (
              <div key={row.id} className="flex items-baseline justify-between gap-3 border-b py-2 last:border-0">
                <p className="truncate font-medium text-navy">{row.name}</p>
                <p className="shrink-0 text-sm text-muted-foreground">
                  {displayPhone(row.phone ?? "")}
                  {row.phoneLabel ? ` · ${row.phoneLabel}` : row.phoneKind === "work" ? " · Work" : " · office?"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
