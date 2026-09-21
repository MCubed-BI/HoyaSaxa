import { isPreviewAlumniId } from "@/lib/alum-preview";
import { seedAlumniIdForLabel } from "@/lib/badge-identity";
import { SGARLATA_CHANNEL_SLUG, canPostSgarlata, type MessageViewer } from "@/lib/messages-auth";

export const DM_CHANNEL_KIND = "dm";
export const STAFF_DM_PARTICIPANT_PREFIX = "admin-";

export type DmParticipantChannel = {
  kind?: string | null;
  slug?: string | null;
  name?: string | null;
  participant_a?: string | null;
  participant_b?: string | null;
};

export function normalizeAlumniId(id: string) {
  return id.trim().toLowerCase();
}

export function dmChannelSlug(alumniIdA: string, alumniIdB: string) {
  const [left, right] = [normalizeAlumniId(alumniIdA), normalizeAlumniId(alumniIdB)].sort();
  return `dm-${left}_${right}`;
}

export function parseDmSlug(slug: string): [string, string] | null {
  if (!slug.startsWith("dm-")) return null;
  const rest = slug.slice(3);
  const splitAt = rest.indexOf("_");
  if (splitAt <= 0 || splitAt === rest.length - 1) return null;
  const left = rest.slice(0, splitAt).trim().toLowerCase();
  const right = rest.slice(splitAt + 1).trim().toLowerCase();
  if (!left || !right) return null;
  return [left, right];
}

export function isDmChannel(channel: DmParticipantChannel) {
  return channel.kind === DM_CHANNEL_KIND || Boolean(channel.slug && parseDmSlug(channel.slug));
}

export function isDmParticipant(channel: DmParticipantChannel, alumniId?: string | null) {
  const id = alumniId?.trim();
  if (!id || isPreviewAlumniId(id)) return false;
  const normalized = normalizeAlumniId(id);
  if (channel.participant_a && normalizeAlumniId(channel.participant_a) === normalized) return true;
  if (channel.participant_b && normalizeAlumniId(channel.participant_b) === normalized) return true;
  const parsed = channel.slug ? parseDmSlug(channel.slug) : null;
  return Boolean(parsed && parsed.includes(normalized));
}

export function staffDmParticipantId(username: string) {
  const slug =
    username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "staff";
  return `${STAFF_DM_PARTICIPANT_PREFIX}${slug}`;
}

export function linkedAlumniIdForViewer(input: {
  alumniId?: string | null;
  username?: string | null;
  label?: string | null;
}) {
  const claimed = input.alumniId?.trim() ?? "";
  if (claimed && !isPreviewAlumniId(claimed)) return claimed;
  return seedAlumniIdForLabel(input.username || input.label || "") ?? null;
}

export function dmParticipantId(viewer: MessageViewer | null | undefined) {
  if (!viewer) return null;
  const claimed = linkedAlumniIdForViewer({
    alumniId: viewer.alumniId,
    username: viewer.label,
    label: viewer.label,
  });
  if (claimed) return claimed;
  if (viewer.isAdmin) {
    const fromKey = viewer.viewerKey?.startsWith("staff:") ? viewer.viewerKey.slice("staff:".length) : viewer.label;
    return staffDmParticipantId(fromKey || "staff");
  }
  return null;
}

export function dmAuthorLabel(viewer: MessageViewer | null | undefined) {
  if (!viewer) return "Admin";
  const claimed = linkedAlumniIdForViewer({
    alumniId: viewer.alumniId,
    username: viewer.label,
    label: viewer.label,
  });
  if (claimed) return viewer.label.trim() || "Alumnus";
  if (viewer.isAdmin) return "Admin";
  return viewer.label.trim() || "Alumnus";
}

export function canMessageHoyaProfile(input: {
  viewerAlumniId?: string | null;
  targetAlumniId?: string | null;
  isAdmin?: boolean;
}) {
  const target = input.targetAlumniId?.trim() ?? "";
  if (!target || isPreviewAlumniId(target)) return false;
  const viewer = input.viewerAlumniId?.trim() ?? "";
  if (viewer && !isPreviewAlumniId(viewer) && normalizeAlumniId(viewer) === normalizeAlumniId(target)) {
    return false;
  }
  if (input.isAdmin) return true;
  if (!viewer || isPreviewAlumniId(viewer)) return false;
  return true;
}

function participantIdFrom(viewerOrAlumniId?: MessageViewer | string | null) {
  if (!viewerOrAlumniId) return null;
  if (typeof viewerOrAlumniId === "string") return viewerOrAlumniId;
  return dmParticipantId(viewerOrAlumniId);
}

export function canViewMessageChannel(
  channel: DmParticipantChannel,
  viewerOrAlumniId?: MessageViewer | string | null,
) {
  if (!isDmChannel(channel)) return true;
  return isDmParticipant(channel, participantIdFrom(viewerOrAlumniId));
}

export function canPostToMessageChannel(channel: DmParticipantChannel, viewer: MessageViewer | null | undefined) {
  if (!viewer) return false;
  if (isDmChannel(channel)) return isDmParticipant(channel, dmParticipantId(viewer));
  if (channel.slug === SGARLATA_CHANNEL_SLUG || channel.kind === "official") {
    return canPostSgarlata(viewer);
  }
  return canPostSgarlata(viewer);
}

export function dmPair(fromAlumniId: string, fromLabel: string, toAlumniId: string, toLabel: string) {
  const fromId = normalizeAlumniId(fromAlumniId);
  const toId = normalizeAlumniId(toAlumniId);
  const leftFirst = fromId < toId;
  const participantA = leftFirst ? fromId : toId;
  const participantB = leftFirst ? toId : fromId;
  const labelA = leftFirst ? fromLabel.trim() : toLabel.trim();
  const labelB = leftFirst ? toLabel.trim() : fromLabel.trim();
  return {
    slug: dmChannelSlug(fromId, toId),
    participantA,
    participantB,
    labelA: labelA || participantA,
    labelB: labelB || participantB,
    name: `${labelA || participantA} · ${labelB || participantB}`,
  };
}

export function dmDisplayName(channel: DmParticipantChannel, viewerAlumniId?: string | null) {
  const parts = (channel.name ?? "")
    .split(" · ")
    .map((part) => part.trim())
    .filter(Boolean);
  const id = viewerAlumniId?.trim();
  if (parts.length === 2 && id) {
    if (channel.participant_a && normalizeAlumniId(channel.participant_a) === normalizeAlumniId(id)) {
      return parts[1] ?? channel.name ?? "Direct message";
    }
    if (channel.participant_b && normalizeAlumniId(channel.participant_b) === normalizeAlumniId(id)) {
      return parts[0] ?? channel.name ?? "Direct message";
    }
  }
  return channel.name?.trim() || "Direct message";
}
