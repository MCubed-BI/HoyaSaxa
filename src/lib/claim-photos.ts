/**
 * Register / claim / validate photo helpers.
 * Persistence still goes through `canEditAlumniRecord` + `POST /api/alum/photos`.
 * Does not scrape LinkedIn (ToS) — alum pastes a photo URL or uploads a file.
 */
import {
  ALUMNI_PHOTO_FIELDS,
  parseAlumniPhotoPatch,
  type AlumniPhotoPatch,
} from "@/lib/alumni-photos";

export type ClaimPhotoValues = {
  football_photo_url: string;
  linkedin_photo_url: string;
};

export function emptyClaimPhotos(): ClaimPhotoValues {
  return { football_photo_url: "", linkedin_photo_url: "" };
}

export function photosFromClaimMatch(
  row?: {
    football_photo_url?: string | null;
    linkedin_photo_url?: string | null;
  } | null,
): ClaimPhotoValues {
  return {
    football_photo_url: row?.football_photo_url?.trim() || "",
    linkedin_photo_url: row?.linkedin_photo_url?.trim() || "",
  };
}

/** Query flags that open the claim photo / validate step instead of bouncing to /me. */
export function isClaimPhotoValidateStep(...values: Array<string | string[] | null | undefined>) {
  return values.some((value) => {
    const text = Array.isArray(value) ? value[0] : value;
    const normalized = text?.trim().toLowerCase();
    return (
      normalized === "1" ||
      normalized === "true" ||
      normalized === "photos" ||
      normalized === "validate" ||
      normalized === "claim"
    );
  });
}

/** Include only non-empty slots so register does not wipe a farmed GUHoyas URL. */
export function photoPatchFromRegisterBody(body: Record<string, unknown> | null | undefined): AlumniPhotoPatch {
  const input: Record<string, unknown> = {};
  if (!body) return parseAlumniPhotoPatch(input);
  for (const field of ALUMNI_PHOTO_FIELDS) {
    const value = body[field];
    if (typeof value === "string" && value.trim()) input[field] = value;
  }
  return parseAlumniPhotoPatch(input);
}

export function hasClaimPhotoValues(values: ClaimPhotoValues) {
  return Boolean(values.football_photo_url.trim() || values.linkedin_photo_url.trim());
}
