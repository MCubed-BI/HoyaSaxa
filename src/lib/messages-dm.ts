import { PREVIEW_ALUMNI_ID } from "@/lib/alum-preview";

export const DM_CHANNEL_KIND = "dm";
export const DM_SLUG_PREFIX = "dm_";

export function normalizeMessagingAlumniId(alumniId: string | null | undefined) {
  const id = alumniId?.trim() ?? "";
  return id || null;
}

export function dmChannelSlug(alumniIdA: string, alumniIdB: string) {
  const left = normalizeMessagingAlumniId(alumniIdA);
  const right = normalizeMessagingAlumniId(alumniIdB);
  if (!left || !right) {
    throw new Error("Both alumni ids are required for a direct message.");
  }
  return `${DM_SLUG_PREFIX}${[left, right].map((id) => id.toLowerCase()).sort().join("_")}`;
}

export function isDmChannelSlug(slug: string | null | undefined) {
  return Boolean(slug?.startsWith(DM_SLUG_PREFIX));
}

export function isDmChannel(channel: { kind?: string | null; slug?: string | null } | null | undefined) {
  if (!channel) return false;
  return channel.kind === DM_CHANNEL_KIND || isDmChannelSlug(channel.slug);
}

export function parseDmChannelSlug(slug: string): [string, string] | null {
  if (!isDmChannelSlug(slug)) return null;
  const rest = slug.slice(DM_SLUG_PREFIX.length);
  const sep = rest.indexOf("_");
  if (sep <= 0 || sep === rest.length - 1) return null;
  const left = rest.slice(0, sep);
  const right = rest.slice(sep + 1);
  if (!left || !right || right.includes("_")) return null;
  return [left, right];
}

export function canMessageAthlete(input: {
  viewerAlumniId?: string | null;
  recipientAlumniId?: string | null;
}) {
  const viewer = normalizeMessagingAlumniId(input.viewerAlumniId);
  const recipient = normalizeMessagingAlumniId(input.recipientAlumniId);
  if (!viewer || !recipient) return false;
  return viewer.toLowerCase() !== recipient.toLowerCase();
}

export function canPostToMessageChannel(
  viewer: { canPost?: boolean; alumniId?: string | null } | null | undefined,
  channel: { kind?: string | null; slug?: string | null } | null | undefined,
) {
  if (!viewer || !channel) return false;
  if (isDmChannel(channel)) {
    return Boolean(normalizeMessagingAlumniId(viewer.alumniId));
  }
  return Boolean(viewer.canPost);
}

export function channelVisibleToViewer(
  channel: { kind?: string | null; slug?: string | null; memberAlumniIds?: string[] },
  viewerAlumniId?: string | null,
) {
  if (!isDmChannel(channel)) return true;
  const viewer = normalizeMessagingAlumniId(viewerAlumniId);
  if (!viewer) return false;
  return (channel.memberAlumniIds ?? []).some((id) => id.toLowerCase() === viewer.toLowerCase());
}

export function messageAthleteHref(alumniId: string) {
  return `/messages/with/${alumniId}`;
}

export function previewMessagingAlumniId() {
  return PREVIEW_ALUMNI_ID;
}
