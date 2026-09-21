"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClaimPhotoFields } from "@/components/claim-photo-fields";
import { Notice } from "@/components/page-chrome";
import { Button } from "@/components/ui/button";
import type { AthletePhotoSlot } from "@/lib/athlete-photo-slots";
import { photosFromClaimMatch, type ClaimPhotoValues } from "@/lib/claim-photos";

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

function slotsToPhotos(slots: AthletePhotoSlot[], linkedinUrl?: string | null): ClaimPhotoValues {
  return photosFromClaimMatch({
    football_photo_url: slots.find((slot) => slot.id === "roster")?.url ?? "",
    linkedin_photo_url: slots.find((slot) => slot.id === "headshot")?.url ?? "",
    linkedin_url: linkedinUrl ?? "",
  });
}

export function AthletePhotoEditor({
  alumniId,
  slots,
  linkedinUrl = "",
}: {
  alumniId: string;
  slots: AthletePhotoSlot[];
  linkedinUrl?: string | null;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<ClaimPhotoValues>(() => slotsToPhotos(slots, linkedinUrl));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rosterUrl = slots.find((slot) => slot.id === "roster")?.url ?? "";
  const headshotUrl = slots.find((slot) => slot.id === "headshot")?.url ?? "";

  useEffect(() => {
    setPhotos(
      photosFromClaimMatch({
        football_photo_url: rosterUrl,
        linkedin_photo_url: headshotUrl,
        linkedin_url: linkedinUrl ?? "",
      }),
    );
  }, [alumniId, headshotUrl, linkedinUrl, rosterUrl]);

  async function save(refreshFromLinkedin = false) {
    setPending(true);
    setError(null);
    setMessage(null);
    setPhotoNotice(null);
    try {
      const response = await fetch("/api/alum/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          alumniId,
          football_photo_url: photos.football_photo_url,
          linkedin_photo_url: photos.linkedin_photo_url,
          linkedin_url: photos.linkedin_url,
          refreshFromLinkedin,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        photos?: { football_photo_url?: string | null; linkedin_photo_url?: string | null };
        linkedinPhoto?: { message?: string | null };
      };
      if (!response.ok) throw new Error(data.error ?? "Save failed");
      if (data.photos) {
        setPhotos((current) => ({
          ...current,
          football_photo_url: data.photos?.football_photo_url?.trim() || current.football_photo_url,
          linkedin_photo_url: data.photos?.linkedin_photo_url?.trim() || current.linkedin_photo_url,
        }));
      }
      setMessage("Saved photos.");
      setPhotoNotice(data.linkedinPhoto?.message ?? null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="space-y-3"
    >
      {message ? <Notice tone="success">{message}</Notice> : null}
      {photoNotice ? (
        <Notice tone={photoNotice.startsWith("Couldn't") ? "muted" : "success"}>{photoNotice}</Notice>
      ) : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <ClaimPhotoFields
        values={photos}
        onChange={setPhotos}
        disabled={pending}
        idPrefix="athlete"
        legend="Photos and LinkedIn"
        onRefreshFromLinkedin={() => void save(true)}
        refreshPending={pending}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save photos"}
      </Button>
    </form>
  );
}
