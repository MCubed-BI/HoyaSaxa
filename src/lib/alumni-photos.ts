/**
 * Additive athlete photo fields on Neon `alumni` (not NTE).
 *
 * Columns: football_photo_url, linkedin_photo_url
 * Edit: claimed self or platform admin only.
 */
import { getDatabaseUrl, getSql } from "@/lib/db";
import { primaryPhotoUrl } from "@/lib/athlete-photo-slots";
import { canEditAlumniRecord, type PlatformRole } from "@/lib/platform-roles";

export const ALUMNI_PHOTO_FIELDS = ["football_photo_url", "linkedin_photo_url"] as const;
export type AlumniPhotoField = (typeof ALUMNI_PHOTO_FIELDS)[number];
export type AlumniPhotoPatch = Partial<Record<AlumniPhotoField, string | null>>;

export type AlumniPhotos = {
  alumniId: string;
  football_photo_url: string | null;
  linkedin_photo_url: string | null;
};

let photosEnsured = false;

export async function ensureAlumniPhotoColumns() {
  if (photosEnsured) return;
  const sql = getSql();
  await sql.query(`ALTER TABLE alumni ADD COLUMN IF NOT EXISTS football_photo_url text`);
  await sql.query(`ALTER TABLE alumni ADD COLUMN IF NOT EXISTS linkedin_photo_url text`);
  photosEnsured = true;
}

export const MAX_PHOTO_UPLOAD_BYTES = 1_500_000;
export const MAX_PHOTO_DATA_URL_CHARS = Math.ceil(MAX_PHOTO_UPLOAD_BYTES * (4 / 3)) + 80;
export const PHOTO_DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp|gif);base64,[a-z0-9+/=\s]+$/i;

export function isAllowedPhotoDataUrl(value: string) {
  return PHOTO_DATA_URL_PATTERN.test(value.trim());
}

export function normalizePhotoUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().startsWith("data:")) {
    if (!isAllowedPhotoDataUrl(trimmed)) {
      throw new Error("Photo upload must be a JPEG, PNG, WebP, or GIF.");
    }
    if (trimmed.length > MAX_PHOTO_DATA_URL_CHARS) {
      throw new Error("Photo is too large. Use a file under 1.5 MB or paste an image URL.");
    }
    return trimmed.replace(/\s+/g, "");
  }
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) {
    throw new Error("Photo URL must be http(s), a site path, or an uploaded image.");
  }
  return trimmed;
}

/** Prefer football, then LinkedIn, then a leftover roster/headshot URL. */
export function preferredAlumniPhotoUrl(
  photos:
    | {
        football_photo_url?: string | null;
        linkedin_photo_url?: string | null;
        footballPhotoUrl?: string | null;
        linkedinPhotoUrl?: string | null;
        photoUrl?: string | null;
      }
    | null
    | undefined,
): string | null {
  return primaryPhotoUrl(photos ?? {});
}

export function parseAlumniPhotoPatch(input: Record<string, unknown> | AlumniPhotoPatch | null | undefined) {
  const patch: AlumniPhotoPatch = {};
  if (!input) return patch;
  for (const field of ALUMNI_PHOTO_FIELDS) {
    if (!(field in input)) continue;
    patch[field] = normalizePhotoUrl(input[field]);
  }
  return patch;
}

export function assertCanEditAlumniPhotos(input: {
  role: PlatformRole;
  actorAlumniId?: string | null;
  targetAlumniId: string;
}) {
  if (!canEditAlumniRecord(input.role, input.actorAlumniId, input.targetAlumniId)) {
    throw new Error("Only the claimed alumnus or an admin can edit photo fields.");
  }
}

export async function getAlumniPhotos(alumniId: string): Promise<AlumniPhotos | null> {
  if (!getDatabaseUrl() || !alumniId.trim()) return null;
  await ensureAlumniPhotoColumns();
  const sql = getSql();
  const rows = (await sql.query(
    `
    SELECT id::text AS "alumniId", football_photo_url, linkedin_photo_url
    FROM alumni
    WHERE id = $1
    LIMIT 1
    `,
    [alumniId],
  )) as AlumniPhotos[];
  return rows[0] ?? null;
}

export async function updateAlumniPhotos(alumniId: string, patch: AlumniPhotoPatch): Promise<AlumniPhotos | null> {
  if (!getDatabaseUrl()) {
    throw new Error("DATABASE_URL is not set");
  }
  await ensureAlumniPhotoColumns();
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const field of ALUMNI_PHOTO_FIELDS) {
    if (!(field in patch)) continue;
    params.push(patch[field] ?? null);
    sets.push(`${field} = $${params.length}`);
  }
  if (sets.length === 0) return getAlumniPhotos(alumniId);
  params.push(alumniId);
  const sql = getSql();
  const rows = (await sql.query(
    `
    UPDATE alumni
    SET ${sets.join(", ")}, updated_at = now()
    WHERE id = $${params.length}
    RETURNING id::text AS "alumniId", football_photo_url, linkedin_photo_url
    `,
    params,
  )) as AlumniPhotos[];
  return rows[0] ?? null;
}
