/**
 * UI mapping for Coder 4 photo columns. Persistence lives in `@/lib/alumni-photos`.
 */
import type { LockerPhotoSlot } from "@/lib/locker-types";

export type AthletePhotoSlot = LockerPhotoSlot;

export type AthletePhotoSource = {
  football_photo_url?: string | null;
  linkedin_photo_url?: string | null;
  footballPhotoUrl?: string | null;
  linkedinPhotoUrl?: string | null;
  /** Last-resort roster/headshot leftover when the two Coder 4 columns are empty. */
  photoUrl?: string | null;
};

function filledUrl(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = value?.trim();
    if (text) return text;
  }
  return null;
}

/** Always two slots. An empty LinkedIn URL must not hide a football photo. */
export function athletePhotoSlots(source: AthletePhotoSource): AthletePhotoSlot[] {
  return [
    {
      id: "roster",
      caption: "Football roster photo",
      url: filledUrl(source.football_photo_url, source.footballPhotoUrl),
    },
    {
      id: "headshot",
      caption: "Current LinkedIn / headshot",
      url: filledUrl(source.linkedin_photo_url, source.linkedinPhotoUrl),
    },
  ];
}

export function primaryPhotoUrl(source: AthletePhotoSource) {
  return filledUrl(
    source.football_photo_url,
    source.footballPhotoUrl,
    source.linkedin_photo_url,
    source.linkedinPhotoUrl,
    source.photoUrl,
  );
}
