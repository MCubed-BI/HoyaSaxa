"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className ?? "space-y-1.5"}>
      <Label htmlFor={`staff-${name}`}>{label}</Label>
      <Input
        id={`staff-${name}`}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
      />
    </div>
  );
}

export function StaffAlumniProfileEditor({
  alumniId,
  overview,
  contact,
  roster,
  netId,
}: {
  alumniId: string;
  overview: OverviewFormFields;
  contact: ProfileContactFormFields;
  roster: AdminRosterFormFields;
  netId?: string | null;
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
    <form onSubmit={save} className="space-y-4" data-staff-profile-editor>
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Player</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" name="first_name" defaultValue={contact.first_name} />
            <Field label="Preferred name" name="preferred_name" defaultValue={contact.preferred_name} />
            <Field label="Last name" name="last_name" defaultValue={roster.last_name} />
            <Field label="Full name" name="full_name" defaultValue={roster.full_name} />
            <Field label="Position" name="sport" defaultValue={overview.sport} placeholder="Football · QB" />
            <Field label="Seasons" name="seasons" defaultValue={roster.seasons} placeholder="2013,2014,2015" />
            <Field label="Class year" name="class_year" defaultValue={roster.class_year} placeholder="2017" />
            <Field label="Hometown" name="hometown" defaultValue={roster.hometown} placeholder="Oradell, NJ" />
            {netId ? (
              <div className="space-y-1.5 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">GTown NetID</p>
                <p className="text-sm text-foreground">{netId}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Now</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Current location"
              name="location"
              defaultValue={overview.location}
              placeholder="New York, NY"
              className="space-y-1.5 sm:col-span-2"
            />
            <Field label="Company" name="company_name" defaultValue={contact.company_name} />
            <Field label="Title" name="job_title" defaultValue={contact.job_title} />
            <Field label="Industry" name="industry" defaultValue={contact.industry} />
            <Field
              label="LinkedIn"
              name="linkedin_url"
              defaultValue={overview.linkedin_url}
              placeholder="linkedin.com/in/…"
            />
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="staff-address_primary">Address</Label>
              <Textarea
                id="staff-address_primary"
                name="address_primary"
                defaultValue={contact.address_primary}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="staff-about">About</Label>
              <Textarea id="staff-about" name="about" defaultValue={overview.about} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="staff-emails">Email</Label>
            <Textarea
              id="staff-emails"
              name="emails"
              defaultValue={overview.emails}
              placeholder={"one@example.com\nanother@georgetown.edu"}
            />
            <p className="text-xs text-muted-foreground">One or more addresses, separated by commas or new lines.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phones</CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Phone" name="phone_primary" defaultValue={contact.phone_primary} />
          </CardContent>
        </Card>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
