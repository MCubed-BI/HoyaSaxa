/**
 * Profile LinkedIn URL (alumni.linkedin_url) — not the headshot slot.
 * Never treat linkedin_photo_url / media.licdn.com images as the profile link.
 */
import { isLikelyDuplicate, type DuplicateNameFields } from "@/lib/alumni-duplicates";

const PHOTO_HOST = /(^|\.)media\.licdn\.com$/i;
const PROFILE_HOST = /(^|\.)linkedin\.com$/i;
const IMAGE_PATH = /\.(?:avif|gif|jpe?g|png|webp)(?:\?|$)/i;

export type LinkedinProfileFields = {
  id?: string;
  firstName?: string | null;
  first_name?: string | null;
  lastName?: string | null;
  last_name?: string | null;
  preferredName?: string | null;
  preferred_name?: string | null;
  fullName?: string | null;
  full_name?: string | null;
  linkedinUrl?: string | null;
  linkedin_url?: string | null;
  linkedinPhotoUrl?: string | null;
  linkedin_photo_url?: string | null;
};

export function normalizeLinkedinProfileUrl(value?: string | null) {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!text) return null;
  const candidate = /^https?:\/\//i.test(text)
    ? text
    : text.toLowerCase().includes("linkedin.com")
      ? `https://${text.replace(/^\/+/, "")}`
      : null;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (PHOTO_HOST.test(url.hostname) || IMAGE_PATH.test(url.pathname)) return null;
    if (!PROFILE_HOST.test(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function linkedinProfileFromRecord(record: LinkedinProfileFields | null | undefined) {
  if (!record) return null;
  return normalizeLinkedinProfileUrl(record.linkedinUrl ?? record.linkedin_url);
}

export function linkedinProfileLabel(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

export function toLinkedinNameFields(record: LinkedinProfileFields): DuplicateNameFields {
  return {
    id: record.id,
    first_name: record.first_name ?? record.firstName ?? null,
    last_name: record.last_name ?? record.lastName ?? null,
    preferred_name: record.preferred_name ?? record.preferredName ?? null,
    full_name: record.full_name ?? record.fullName ?? null,
  };
}

/** Own linkedin_url first; else a nickname-matching sibling. Ignores photo slots. */
export function pickLinkedinProfileUrl(
  person: LinkedinProfileFields,
  candidates: LinkedinProfileFields[] = [],
) {
  const own = linkedinProfileFromRecord(person);
  if (own) return own;
  const self = toLinkedinNameFields(person);
  for (const row of candidates) {
    if (!isLikelyDuplicate(self, toLinkedinNameFields(row))) continue;
    const url = linkedinProfileFromRecord(row);
    if (url) return url;
  }
  return null;
}
