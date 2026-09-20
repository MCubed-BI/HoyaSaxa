"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/page-chrome";
import type { AthletePhotoSlot } from "@/lib/athlete-photo-slots";

export function AthletePhotoPair({
  slots,
  size = "md",
}: {
  slots: AthletePhotoSlot[];
  size?: "md" | "lg";
}) {
  const frame = size === "lg" ? "aspect-[4/5] w-full" : "h-28 w-24 sm:h-32 sm:w-28";
  return (
    <div className="grid grid-cols-2 gap-3">
      {slots.map((slot) => (
        <figure key={slot.id} className="min-w-0">
          <div className={`${frame} overflow-hidden rounded-lg bg-muted/40 ring-1 ring-navy/10`}>
            {slot.url ? (
              // External roster / LinkedIn photos are optional user URLs.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slot.url} alt={slot.caption} className="h-full w-full object-cover object-top" />
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
                {slot.caption} — empty
              </div>
            )}
          </div>
          <figcaption className="mt-1.5 text-xs font-medium text-navy">{slot.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function AthletePhotoEditor({
  alumniId,
  slots,
}: {
  alumniId: string;
  slots: AthletePhotoSlot[];
}) {
  const router = useRouter();
  const roster = slots.find((slot) => slot.id === "roster")?.url ?? "";
  const headshot = slots.find((slot) => slot.id === "headshot")?.url ?? "";
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/alum/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          alumniId,
          football_photo_url: String(form.get("football_photo_url") ?? ""),
          linkedin_photo_url: String(form.get("linkedin_photo_url") ?? ""),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Save failed");
      setMessage("Saved photos.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <div className="space-y-1.5">
        <Label htmlFor="football_photo_url">Football roster photo URL</Label>
        <Input id="football_photo_url" name="football_photo_url" defaultValue={roster} placeholder="https://…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="linkedin_photo_url">Current LinkedIn / headshot URL</Label>
        <Input id="linkedin_photo_url" name="linkedin_photo_url" defaultValue={headshot} placeholder="https://…" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save photos"}
      </Button>
    </form>
  );
}
