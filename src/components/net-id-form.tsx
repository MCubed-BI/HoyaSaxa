"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NetIdForm({
  defaultValue = "",
  alumniId,
  submitLabel = "Save GTown NetID",
  onSaved,
}: {
  defaultValue?: string;
  alumniId?: string | null;
  submitLabel?: string;
  onSaved?: (netId: string) => void;
}) {
  const router = useRouter();
  const [netId, setNetId] = useState(defaultValue);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/alum/net-id", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          netId,
          ...(alumniId ? { alumniId } : {}),
        }),
      });
      const data = (await response.json()) as { error?: string; netId?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not save GTown NetID.");
      const saved = data.netId ?? netId.trim().toLowerCase();
      setNetId(saved);
      setMessage("Saved GTown NetID.");
      router.refresh();
      onSaved?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save GTown NetID.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="netId">GTown NetID</Label>
        <Input
          id="netId"
          name="netId"
          value={netId}
          onChange={(event) => setNetId(event.target.value)}
          autoComplete="username"
          placeholder="mak264"
          required
        />
        <p className="text-xs text-muted-foreground">
          The part before @georgetown.edu. Example: mak264@georgetown.edu → mak264.
        </p>
      </div>
      {message ? <p className="text-sm text-navy">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
