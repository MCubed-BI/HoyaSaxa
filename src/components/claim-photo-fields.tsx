"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_PHOTO_UPLOAD_BYTES } from "@/lib/alumni-photos";
import type { ClaimPhotoValues } from "@/lib/claim-photos";

const SLOTS = [
  {
    field: "football_photo_url",
    label: "Football roster photo",
    hint: "GUHoyas roster URL is shown when one is already on file. Upload a file or paste an image URL to replace it.",
  },
  {
    field: "linkedin_photo_url",
    label: "LinkedIn / headshot",
    hint: "Upload a file or paste an image URL. If a LinkedIn profile URL is saved and this slot is empty, we try a public preview.",
  },
] as const;

export function readImageFile(file: File) {
  if (file.type === "image/svg+xml" || !/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.type)) {
    return Promise.reject(new Error("Choose a JPEG, PNG, WebP, or GIF photo."));
  }
  if (file.size > MAX_PHOTO_UPLOAD_BYTES) {
    return Promise.reject(new Error("Photo must be 1.5 MB or smaller."));
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read that photo."));
    };
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.readAsDataURL(file);
  });
}

function PhotoPreview({ url, label }: { url: string; label: string }) {
  return (
    <div className="aspect-[4/5] overflow-hidden rounded-lg bg-muted/40 ring-1 ring-navy/10">
      {url ? (
        // User-supplied roster / headshot URLs and local uploads.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="h-full w-full object-cover object-top" />
      ) : (
        <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
          {label === "LinkedIn / headshot" ? "Empty — upload or paste a URL" : `${label} — empty`}
        </div>
      )}
    </div>
  );
}

export function ClaimPhotoFields({
  values,
  onChange,
  disabled = false,
  idPrefix = "claim",
  legend = "Photos",
  description = "Upload a file or paste an image URL. Saving a LinkedIn profile URL tries a public preview photo — we never log into LinkedIn.",
  showLinkedinUrl = true,
  onRefreshFromLinkedin,
  refreshPending = false,
}: {
  values: ClaimPhotoValues;
  onChange: (next: ClaimPhotoValues) => void;
  disabled?: boolean;
  idPrefix?: string;
  legend?: string;
  description?: string;
  showLinkedinUrl?: boolean;
  onRefreshFromLinkedin?: () => void;
  refreshPending?: boolean;
}) {
  const reactId = useId();
  const prefix = `${idPrefix}-${reactId}`;
  const [fileError, setFileError] = useState<string | null>(null);

  async function onFile(field: keyof ClaimPhotoValues, file: File | undefined) {
    if (!file) return;
    setFileError(null);
    try {
      const url = await readImageFile(file);
      onChange({ ...values, [field]: url });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Could not read that photo.");
    }
  }

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium">{legend}</legend>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="grid grid-cols-2 gap-3">
        {SLOTS.map((slot) => (
          <PhotoPreview key={slot.field} url={values[slot.field]} label={slot.label} />
        ))}
      </div>
      {showLinkedinUrl ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-linkedin_url`}>LinkedIn profile URL</Label>
          <Input
            id={`${prefix}-linkedin_url`}
            name="linkedin_url"
            value={values.linkedin_url}
            onChange={(event) => onChange({ ...values, linkedin_url: event.target.value })}
            placeholder="https://www.linkedin.com/in/…"
            inputMode="url"
            autoComplete="url"
          />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Best-effort public preview only. Upload or paste still works if LinkedIn blocks the fetch.
            </p>
          </div>
        </div>
      ) : null}
      {SLOTS.map((slot) => {
        const inputId = `${prefix}-${slot.field}`;
        const fileId = `${inputId}-file`;
        return (
          <div key={slot.field} className="space-y-1.5">
            <Label htmlFor={inputId}>{slot.label}</Label>
            <Input
              id={inputId}
              name={slot.field}
              value={values[slot.field]}
              onChange={(event) => onChange({ ...values, [slot.field]: event.target.value })}
              placeholder="https://… or upload below"
              inputMode="url"
              autoComplete="off"
            />
            <Input
              id={fileId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => {
                void onFile(slot.field, event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">{slot.hint}</p>
              {slot.field === "linkedin_photo_url" && onRefreshFromLinkedin ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || refreshPending}
                  onClick={onRefreshFromLinkedin}
                >
                  {refreshPending ? "Refreshing…" : "Refresh from LinkedIn"}
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
      {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}
    </fieldset>
  );
}
