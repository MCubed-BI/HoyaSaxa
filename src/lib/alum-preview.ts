/** Sentinel used when preview `Alum` login has no claimed roster row. */
export const PREVIEW_ALUMNI_ID = "00000000-0000-0000-0000-000000000000";

export function isPreviewAlumniId(alumniId: string | null | undefined) {
  return Boolean(alumniId && alumniId.trim() === PREVIEW_ALUMNI_ID);
}
