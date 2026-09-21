"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/page-chrome";
import { overviewPatchFromForm, type OverviewFormFields } from "@/lib/alumni-overview";

export function AthleteOverviewFields({
  defaults,
  idPrefix = "",
}: {
  defaults: OverviewFormFields;
  idPrefix?: string;
}) {
  const id = (name: string) => `${idPrefix}${name}`;
  return (
    <div className="grid gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={id("about")}>About</Label>
        <Textarea
          id={id("about")}
          name="about"
          defaultValue={defaults.about}
          placeholder="Growth Strategy @ Charlie Health | LBS MBA | Published Author"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("sport")}>Sport</Label>
          <Input
            id={id("sport")}
            name="sport"
            defaultValue={defaults.sport}
            placeholder="Football · WR"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("location")}>Location</Label>
          <Input
            id={id("location")}
            name="location"
            defaultValue={defaults.location}
            placeholder="New York, NY"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id("emails")}>Email</Label>
        <Textarea
          id={id("emails")}
          name="emails"
          defaultValue={defaults.emails}
          placeholder={"one@example.com\nanother@georgetown.edu"}
        />
        <p className="text-xs text-muted-foreground">One or more addresses, separated by commas or new lines.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id("linkedin_url")}>LinkedIn</Label>
        <Input
          id={id("linkedin_url")}
          name="linkedin_url"
          defaultValue={defaults.linkedin_url}
          placeholder="linkedin.com/in/your-profile"
        />
      </div>
    </div>
  );
}

export function AthleteOverviewEditor({
  alumniId,
  defaults,
}: {
  alumniId: string;
  defaults: OverviewFormFields;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/alumni/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alumniId, patch: overviewPatchFromForm(new FormData(form)) }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Save failed");
      setMessage("Saved Overview.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3" data-overview-editor>
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <AthleteOverviewFields defaults={defaults} idPrefix="overview-" />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save Overview"}
      </Button>
    </form>
  );
}
