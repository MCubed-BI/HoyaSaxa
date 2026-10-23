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
}: {
  alumniId: string;
  initialKind: PersonKind;
  initialVerified: boolean;
}) {
  const [kind, setKind] = useState<PersonKind>(initialKind);
  const [verified, setVerified] = useState(initialVerified);
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
        person?: { person_kind: PersonKind; admin_verified: boolean };
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not update person.");
      if (data.person) {
        setKind(data.person.person_kind);
        setVerified(data.person.admin_verified);
      }
      setMessage("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update person.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card px-4 py-3 text-sm shadow-[var(--shadow-xs)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium text-navy">Directory role</p>
          <p className="text-muted-foreground">
            Player (Alum) or Georgetown Supporter. Supporters show in gold and are excluded from Alum-only
            filters.
          </p>
          <p className="flex flex-wrap items-center gap-2 pt-1">
            {kind === "supporter" ? (
              <span className={supportBadgeClassName}>Support</span>
            ) : (
              <span className="rounded-md bg-navy px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                Alum
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {personKindLabel(kind)} · {verified ? "Verified" : "Unverified"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
            value={kind}
            disabled={pending}
            onChange={(event) => patch({ personKind: event.target.value as PersonKind })}
            aria-label="Directory role"
          >
            <option value="alum">{PERSON_KIND_ADMIN_LABELS.alum}</option>
            <option value="supporter">{PERSON_KIND_ADMIN_LABELS.supporter}</option>
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
