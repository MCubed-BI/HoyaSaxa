/**
 * Persist a best-effort LinkedIn preview onto alumni.linkedin_photo_url.
 * Never blocks the rest of a save: fetch is timed out and failures keep the current photo.
 */
import { getAlumniPhotos, updateAlumniPhotos, type AlumniPhotos } from "@/lib/alumni-photos";
import { getSql } from "@/lib/db";
import { normalizeLinkedinProfileUrl } from "@/lib/linkedin-profile";
import {
  LINKEDIN_PHOTO_RESOLVED_MESSAGE,
  LINKEDIN_PHOTO_UNAVAILABLE_MESSAGE,
  planLinkedinPhotoSave,
  resolveLinkedinPreviewImage,
  type LinkedinPhotoNotice,
} from "@/lib/linkedin-photo";

export type LinkedinPhotoSaveResult = {
  photos: AlumniPhotos | null;
  linkedinPhoto: LinkedinPhotoNotice;
};

async function getAlumniLinkedinUrl(alumniId: string) {
  const sql = getSql();
  const rows = (await sql.query(
    `SELECT linkedin_url FROM alumni WHERE id = $1 LIMIT 1`,
    [alumniId],
  )) as Array<{ linkedin_url: string | null }>;
  return normalizeLinkedinProfileUrl(rows[0]?.linkedin_url);
}

async function persistLinkedinUrl(alumniId: string, url: string, overwrite: boolean) {
  const sql = getSql();
  if (overwrite) {
    await sql.query(`UPDATE alumni SET linkedin_url = $2, updated_at = now() WHERE id = $1`, [alumniId, url]);
    return;
  }
  await sql.query(
    `
    UPDATE alumni
    SET linkedin_url = COALESCE(NULLIF(btrim(linkedin_url), ''), $2),
        updated_at = now()
    WHERE id = $1
    `,
    [alumniId, url],
  );
}

export async function syncLinkedinPhotoOnSave(input: {
  alumniId: string;
  incomingPhoto?: string | null;
  incomingProfileUrl?: string | null;
  refreshFromLinkedin?: boolean;
}): Promise<LinkedinPhotoSaveResult> {
  const existing = await getAlumniPhotos(input.alumniId);
  const existingProfileUrl = await getAlumniLinkedinUrl(input.alumniId);
  const plan = planLinkedinPhotoSave({
    existingPhoto: existing?.linkedin_photo_url ?? null,
    existingProfileUrl,
    incomingPhoto: input.incomingPhoto,
    incomingProfileUrl: input.incomingProfileUrl,
    refreshFromLinkedin: input.refreshFromLinkedin,
  });

  if (plan.profileUrlToPersist) {
    await persistLinkedinUrl(input.alumniId, plan.profileUrlToPersist.url, plan.profileUrlToPersist.overwrite);
  }

  if (plan.fetchProfileUrl) {
    const resolved = await resolveLinkedinPreviewImage(plan.fetchProfileUrl);
    if (resolved.imageUrl) {
      const photos = await updateAlumniPhotos(input.alumniId, { linkedin_photo_url: resolved.imageUrl });
      return {
        photos,
        linkedinPhoto: {
          status: "resolved",
          imageUrl: resolved.imageUrl,
          message: LINKEDIN_PHOTO_RESOLVED_MESSAGE,
        },
      };
    }
    if (plan.writePhoto !== undefined) {
      const photos = await updateAlumniPhotos(input.alumniId, { linkedin_photo_url: plan.writePhoto });
      return {
        photos,
        linkedinPhoto: {
          status: "unavailable",
          imageUrl: photos?.linkedin_photo_url ?? plan.keepPhotoOnFetchFailure,
          message: LINKEDIN_PHOTO_UNAVAILABLE_MESSAGE,
        },
      };
    }
    return {
      photos: existing,
      linkedinPhoto: {
        status: "unavailable",
        imageUrl: plan.keepPhotoOnFetchFailure,
        message: LINKEDIN_PHOTO_UNAVAILABLE_MESSAGE,
      },
    };
  }

  if (plan.writePhoto !== undefined) {
    const photos = await updateAlumniPhotos(input.alumniId, { linkedin_photo_url: plan.writePhoto });
    return {
      photos,
      linkedinPhoto: plan.skipNotice ?? {
        status: "skipped",
        imageUrl: photos?.linkedin_photo_url ?? null,
        message: null,
      },
    };
  }

  return {
    photos: existing,
    linkedinPhoto: plan.skipNotice ?? {
      status: "skipped",
      imageUrl: existing?.linkedin_photo_url ?? null,
      message: null,
    },
  };
}

export function refreshFromLinkedinFlag(body: Record<string, unknown> | null | undefined) {
  return body?.refreshFromLinkedin === true || body?.refresh_from_linkedin === true;
}

export function optionalStringField(body: Record<string, unknown> | null | undefined, key: string) {
  if (!body || !(key in body)) return undefined;
  const value = body[key];
  if (value == null) return null;
  return typeof value === "string" ? value : undefined;
}
