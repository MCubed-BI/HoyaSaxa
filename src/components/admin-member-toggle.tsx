"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AdminMemberToggle({
  alumniId,
  name,
  email,
  username,
  granted,
}: {
  alumniId: string;
  name: string;
  email?: string;
  username?: string;
  granted: boolean;
}) {
  const [admin, setAdmin] = useState(granted);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keptOwner, setKeptOwner] = useState(false);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          alumniId,
          admin: !admin,
          name,
          email,
          username: username || name,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        admin?: boolean;
        keptOwner?: boolean;
      };
      if (!response.ok) throw new Error(data.error ?? "Could not update Admin");
      if (data.keptOwner && admin) {
        setKeptOwner(true);
        return;
      }
      setAdmin(Boolean(data.admin));
      setKeptOwner(Boolean(data.keptOwner));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update Admin");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card px-4 py-3 text-sm shadow-[var(--shadow-xs)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-navy">{name}</p>
          <p className="text-muted-foreground">
            {[username, email].filter(Boolean).join(" · ") || alumniId}
          </p>
          <p className="mt-1 text-muted-foreground">
            {admin
              ? "Admin — full access after central sign-in with their username/Net ID and password."
              : "Not an Admin. Grant Admin so their next sign-in unlocks admin rights."}
          </p>
        </div>
        <Button type="button" variant={admin ? "secondary" : "outline"} onClick={toggle} disabled={pending}>
          {pending ? "Saving…" : admin ? "Remove Admin" : "Grant Admin"}
        </Button>
      </div>
      {keptOwner ? (
        <p className="mt-2 text-muted-foreground">Owner accounts stay Admin and cannot be demoted here.</p>
      ) : null}
      {error ? <p className="mt-2 text-destructive">{error}</p> : null}
    </div>
  );
}
