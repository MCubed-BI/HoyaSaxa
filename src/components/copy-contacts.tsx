"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

type Payload = {
  count: number;
  emails: string[];
  phones: string[];
};

export function CopyContacts({ query }: { query: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<"emails" | "phones" | null>(null);

  async function copy(kind: "emails" | "phones") {
    setBusy(kind);
    setStatus(null);
    try {
      const response = await fetch(`/api/report-contacts${query ? `?${query}` : ""}`);
      if (!response.ok) {
        throw new Error("Could not load contacts");
      }
      const data = (await response.json()) as Payload;
      const values = kind === "emails" ? data.emails : data.phones;
      if (values.length === 0) {
        setStatus(`No ${kind} in this group.`);
        return;
      }
      await navigator.clipboard.writeText(values.join(kind === "emails" ? ", " : "\n"));
      setStatus(`Copied ${formatNumber(values.length)} ${kind}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Copy failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => copy("emails")} disabled={busy !== null}>
          {busy === "emails" ? "Copying…" : "Copy emails"}
        </Button>
        <Button type="button" variant="outline" onClick={() => copy("phones")} disabled={busy !== null}>
          {busy === "phones" ? "Copying…" : "Copy phones"}
        </Button>
        <Button asChild variant="secondary">
          <a href={`/api/export${query ? `?${query}` : ""}`}>Download CSV</a>
        </Button>
        <Button asChild>
          <a href={`/blast${query ? `?${query}` : ""}`}>Text blast</a>
        </Button>
        <Button asChild variant="outline">
          <a href={`/blast?${query ? `${query}&` : ""}channel=email`}>Email blast</a>
        </Button>
      </div>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}
