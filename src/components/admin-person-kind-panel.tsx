"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PERSON_KIND_ADMIN_LABELS,
  personKindLabel,
  type PersonKind,
} from "@/lib/person-kind";
import { supportBadgeClassName } from "@/lib/supporter-style";

export function AdminPersonKindPanel({
  alumniId,
  initialKind,
  initialVerified,
  initialStaffUsername,
}: {
  alumniId: string;
  initialKind: PersonKind;
  initialVerified: boolean;
  initialStaffUsername?: string | null;
}) {
  const [kind, setKind] = useState<PersonKind>(initialKind);
  const [verified, setVerified] = useState(initialVerified);
  const [staffUsername, setStaffUsername] = useState(initialStaffUsername ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/people/${alumniId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        person?: { person_kind: PersonKind; admin_verified: boolean; staff_username?: string | null };
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not update person.");
      if (data.person) {
        setKind(data.person.person_kind);
        setVerified(data.person.admin_verified);
        if (data.person.staff_username != null) setStaffUsername(data.person.staff_username);
      }
      setMessage("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update person.");
    } finally {
      setPending(false);
    }
  }

  function onKindChange(next: PersonKind) {
    if (next === kind) return;
    if (next === "development") {
      const nextUsername = window.prompt("Username for central login", staffUsername || "");
      if (nextUsername == null) return;
      const nextPassword = window.prompt("Password (min 8 characters)");
      if (nextPassword == null) return;
      void patch({ personKind: next, username: nextUsername, password: nextPassword });
      return;
    }
    void patch({ personKind: next });
  }

  return (
    <div className="rounded-xl border bg-card px-4 py-3 text-sm shadow-[var(--shadow-xs)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium text-navy">Directory role</p>
          <p className="text-muted-foreground">
            Player (Alum), Georgetown Supporter, or Development. Development gets full admin access with a
            username and password for central sign-in.
          </p>
          <p className="flex flex-wrap items-center gap-2 pt-1">
            {kind === "supporter" ? (
              <span className={supportBadgeClassName}>Support</span>
            ) : kind === "development" ? (
              <span className="rounded-md bg-navy px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                Development
              </span>
            ) : (
              <span className="rounded-md bg-navy px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                Alum
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {personKindLabel(kind)}
              {kind === "development" && staffUsername ? ` · @${staffUsername}` : ""} ·{" "}
              {verified ? "Verified" : "Unverified"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
            value={kind}
            disabled={pending}
            onChange={(event) => onKindChange(event.target.value as PersonKind)}
            aria-label="Directory role"
          >
            <option value="alum">{PERSON_KIND_ADMIN_LABELS.alum}</option>
            <option value="supporter">{PERSON_KIND_ADMIN_LABELS.supporter}</option>
            <option value="development">{PERSON_KIND_ADMIN_LABELS.development}</option>
          </select>
          <Button
            type="button"
            variant={verified ? "outline" : "default"}
            disabled={pending}
            onClick={() => patch({ verified: !verified })}
          >
            {pending ? "Saving…" : verified ? "Unverify" : "Verify"}
          </Button>
        </div>
      </div>
      {message ? <p className="mt-2 text-navy">{message}</p> : null}
      {error ? <p className="mt-2 text-destructive">{error}</p> : null}
    </div>
  );
}
