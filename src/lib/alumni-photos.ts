/**
 * Additive athlete photo fields on Neon `alumni` (not NTE).
 *
 * Columns: football_photo_url, linkedin_photo_url
 * Edit: claimed self or platform admin only.
 */
import { getDatabaseUrl, getSql } from "@/lib/db";
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

export function normalizePhotoUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) {
    throw new Error("Photo URL must be http(s) or a site path.");
  }
  return trimmed;
}

/** Prefer the farmed football headshot; fall back to a stored LinkedIn URL. Does not scrape LinkedIn. */
export function preferredAlumniPhotoUrl(
  photos: { football_photo_url?: string | null; linkedin_photo_url?: string | null } | null | undefined,
): string | null {
  const football = photos?.football_photo_url?.trim();
  if (football) return football;
  const linkedin = photos?.linkedin_photo_url?.trim();
  if (linkedin) return linkedin;
  return null;
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
