"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DirectoryNameSearch } from "@/components/directory-name-search";
import type { DirectoryPersonSuggestion, DirectorySearchView } from "@/lib/directory-search";

export function MessagesNew({
  view,
  viewerAlumniId,
  heading = true,
}: {
  view: DirectorySearchView;
  viewerAlumniId?: string | null;
  heading?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function startDm(hit: DirectoryPersonSuggestion) {
    const self = viewerAlumniId?.trim().toLowerCase();
    if (self && hit.id.trim().toLowerCase() === self) {
      setError("You can't message yourself.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/messages/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ alumniId: hit.id }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        channel?: { slug?: string };
      };
      if (!response.ok) {
        setError(data.error || "Could not start the message.");
        return;
      }
      const slug = data.channel?.slug;
      if (!slug) {
        setError("Could not open the thread.");
        return;
      }
      router.push(`/messages/${slug}`);
    } catch {
      setError("Could not start the message.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3" data-testid="messages-new">
      {heading ? (
        <div className="space-y-1">
          <h2 className="font-heading text-xl text-navy">New message</h2>
          <p className="text-sm text-muted-foreground">Find a Hoya and open a private thread.</p>
        </div>
      ) : null}
      <DirectoryNameSearch
        view={view}
        openProfileOnSelect={false}
        onSelect={(hit) => void startDm(hit)}
        label="Find someone to message"
        placeholder="Search a name or preferred name"
      />
      {pending ? <p className="text-sm text-muted-foreground">Opening thread…</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
