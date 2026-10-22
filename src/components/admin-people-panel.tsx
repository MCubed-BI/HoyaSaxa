"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { displayName } from "@/lib/format";
import type { AdminPersonRow } from "@/lib/people-admin";
import { PERSON_KIND_ADMIN_LABELS, personKindLabel, type PersonKind } from "@/lib/person-kind";

function place(row: AdminPersonRow) {
  const current = [row.current_city, row.current_state].filter(Boolean).join(", ");
  const hometown = [row.hometown_city, row.hometown_state].filter(Boolean).join(", ");
  return current || hometown || "—";
}

export function AdminPeoplePanel({
  initialPeople,
  initialPending,
}: {
  initialPeople: AdminPersonRow[];
  initialPending: number;
}) {
  const [people, setPeople] = useState(initialPeople);
  const [pending, setPending] = useState(initialPending);
  const [filter, setFilter] = useState<"pending" | "recent">("pending");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [currentState, setCurrentState] = useState("");
  const [personKind, setPersonKind] = useState<PersonKind>("supporter");
  const [verifiedOnCreate, setVerifiedOnCreate] = useState(true);

  const visible = useMemo(
    () => (filter === "pending" ? people.filter((row) => !row.admin_verified) : people),
    [filter, people],
  );

  async function refresh() {
    const response = await fetch("/api/admin/people");
    const data = (await response.json()) as {
      people?: AdminPersonRow[];
      pending?: number;
      error?: string;
    };
    if (!response.ok) throw new Error(data.error || "Could not refresh people.");
    setPeople(data.people ?? []);
    setPending(data.pending ?? 0);
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/people", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          currentCity,
          currentState,
          personKind,
          verified: verifiedOnCreate,
        }),
      });
      const data = (await response.json()) as { person?: AdminPersonRow; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not add person.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setCurrentCity("");
      setCurrentState("");
      setMessage(
        `Added ${displayName(data.person!)} as ${personKindLabel(data.person!.person_kind)}${
          data.person!.admin_verified ? " (verified)" : " — pending verification"
        }.`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add person.");
    } finally {
      setBusy(false);
    }
  }

  async function patchPerson(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/people/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { person?: AdminPersonRow; error?: string };
      if (!response.ok) throw new Error(data.error || "Update failed.");
      setMessage(
        body.verified === true
          ? `Verified ${displayName(data.person!)}.`
          : body.verified === false
            ? `Marked ${displayName(data.person!)} as unverified.`
            : `Updated ${displayName(data.person!)}.`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onCreate} className="space-y-4 rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div>
          <h3 className="font-heading text-base text-navy">Add person</h3>
          <p className="text-sm text-muted-foreground">
            Create a Player (Alum) or Georgetown Supporter. Supporters are not tagged as Alum in filters and
            directory badges.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">First name</span>
            <input
              className="h-10 w-full rounded-lg border border-input bg-background px-3"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last name *</span>
            <input
              required
              className="h-10 w-full rounded-lg border border-input bg-background px-3"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</span>
            <input
              type="email"
              className="h-10 w-full rounded-lg border border-input bg-background px-3"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</span>
            <input
              className="h-10 w-full rounded-lg border border-input bg-background px-3"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">City</span>
            <input
              className="h-10 w-full rounded-lg border border-input bg-background px-3"
              value={currentCity}
              onChange={(event) => setCurrentCity(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">State</span>
            <input
              className="h-10 w-full rounded-lg border border-input bg-background px-3"
              value={currentState}
              onChange={(event) => setCurrentState(event.target.value)}
              placeholder="FL"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</span>
            <select
              className="block h-10 min-w-[12rem] rounded-lg border border-input bg-background px-3"
              value={personKind}
              onChange={(event) => setPersonKind(event.target.value as PersonKind)}
            >
              <option value="alum">{PERSON_KIND_ADMIN_LABELS.alum}</option>
              <option value="supporter">{PERSON_KIND_ADMIN_LABELS.supporter}</option>
            </select>
          </label>
          <label className="mt-5 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-navy"
              checked={verifiedOnCreate}
              onChange={(event) => setVerifiedOnCreate(event.target.checked)}
            />
            Mark verified on create
          </label>
          <Button type="submit" disabled={busy || !lastName.trim()} className="mt-5">
            {busy ? "Saving…" : "Add person"}
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
          >
            Pending verify ({pending})
          </Button>
          <Button
            type="button"
            variant={filter === "recent" ? "default" : "outline"}
            onClick={() => setFilter("recent")}
          >
            Recent / all loaded
          </Button>
        </div>
        {message ? <p className="text-sm text-navy">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {visible.length === 0 ? (
          <p className="rounded-xl border px-4 py-6 text-sm text-muted-foreground">
            {filter === "pending"
              ? "No people waiting for verification. Add someone above, or uncheck “Mark verified on create”."
              : "No people loaded yet."}
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((row) => (
              <li key={row.id} className="rounded-xl border bg-card px-4 py-3 shadow-[var(--shadow-xs)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-navy">
                      <Link href={`/alumni/${row.id}`} className="hover:underline">
                        {displayName(row)}
                      </Link>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {personKindLabel(row.person_kind)}
                      {row.admin_verified ? " · Verified" : " · Unverified"}
                      {" · "}
                      {place(row)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[row.email_primary, row.phone_primary].filter(Boolean).join(" · ") || "No contact yet"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                      value={row.person_kind}
                      disabled={busy}
                      onChange={(event) =>
                        patchPerson(row.id, { personKind: event.target.value as PersonKind })
                      }
                      aria-label={`Role for ${displayName(row)}`}
                    >
                      <option value="alum">{PERSON_KIND_ADMIN_LABELS.alum}</option>
                      <option value="supporter">{PERSON_KIND_ADMIN_LABELS.supporter}</option>
                    </select>
                    {row.admin_verified ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => patchPerson(row.id, { verified: false })}
                      >
                        Unverify
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => patchPerson(row.id, { verified: true })}
                      >
                        Verify
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
