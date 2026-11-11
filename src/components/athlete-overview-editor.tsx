"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/page-chrome";
import {
  overviewPatchFromForm,
  type AdminRosterFormFields,
  type OverviewFormFields,
  type ProfileContactFormFields,
} from "@/lib/alumni-overview";

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

function Field({
  label,
  name,
  defaultValue,
  idPrefix = "",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  idPrefix?: string;
  placeholder?: string;
}) {
  const id = `${idPrefix}${name}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} />
    </div>
  );
}

export function AthleteContactFields({
  defaults,
  idPrefix = "",
}: {
  defaults: ProfileContactFormFields;
  idPrefix?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="First name" name="first_name" defaultValue={defaults.first_name} idPrefix={idPrefix} />
      <Field label="Preferred name" name="preferred_name" defaultValue={defaults.preferred_name} idPrefix={idPrefix} />
      <Field label="Phone" name="phone_primary" defaultValue={defaults.phone_primary} idPrefix={idPrefix} />
      <Field label="Company" name="company_name" defaultValue={defaults.company_name} idPrefix={idPrefix} />
      <Field label="Title" name="job_title" defaultValue={defaults.job_title} idPrefix={idPrefix} />
      <Field label="Industry" name="industry" defaultValue={defaults.industry} idPrefix={idPrefix} />
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}address_primary`}>Address</Label>
        <Textarea
          id={`${idPrefix}address_primary`}
          name="address_primary"
          defaultValue={defaults.address_primary}
        />
      </div>
    </div>
  );
}

export function AdminRosterFields({
  defaults,
  idPrefix = "",
}: {
  defaults: AdminRosterFormFields;
  idPrefix?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Last name" name="last_name" defaultValue={defaults.last_name} idPrefix={idPrefix} />
      <Field label="Full name" name="full_name" defaultValue={defaults.full_name} idPrefix={idPrefix} />
      <Field
        label="Class year"
        name="class_year"
        defaultValue={defaults.class_year}
        idPrefix={idPrefix}
        placeholder="2015"
      />
      <Field
        label="Seasons"
        name="seasons"
        defaultValue={defaults.seasons}
        idPrefix={idPrefix}
        placeholder="2011-2014"
      />
      <div className="sm:col-span-2">
        <Field
          label="Hometown"
          name="hometown"
          defaultValue={defaults.hometown}
          idPrefix={idPrefix}
          placeholder="Chicago, IL"
        />
      </div>
    </div>
  );
}

export function AthleteOverviewEditor({
  alumniId,
  defaults,
  contactDefaults,
  adminRosterDefaults,
  title = "Save Overview",
}: {
  alumniId: string;
  defaults: OverviewFormFields;
  contactDefaults?: ProfileContactFormFields;
  adminRosterDefaults?: AdminRosterFormFields;
  title?: string;
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
      setMessage("Saved profile.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4" data-overview-editor>
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <AthleteOverviewFields defaults={defaults} idPrefix="overview-" />
      {contactDefaults ? <AthleteContactFields defaults={contactDefaults} idPrefix="overview-" /> : null}
      {adminRosterDefaults ? (
        <div className="space-y-3 border-t pt-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Roster (admin)</p>
          <AdminRosterFields defaults={adminRosterDefaults} idPrefix="overview-" />
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : title}
      </Button>
    </form>
  );
}
