import { NextResponse } from "next/server";
import { displayName } from "@/lib/format";
import { isMissingDatabaseConfig } from "@/lib/db";
import { toNameFields } from "@/lib/locker-classify";
import { getLockerPersonById } from "@/lib/locker-directory";
import { getMessageViewer } from "@/lib/messages-auth";
import {
  canMessageHoyaProfile,
  dmAuthorLabel,
  dmParticipantId,
  linkedAlumniIdForViewer,
} from "@/lib/messages-dm";
import { findOrCreateDmChannel } from "@/lib/messages";

function profilePath(alumniId: string, request: Request) {
  const referer = request.headers.get("referer") ?? "";
  try {
    const path = new URL(referer).pathname;
    if (path.startsWith("/alumni/")) return `/alumni/${alumniId}`;
  } catch {
    // Fall through to the Hoya profile.
  }
  return `/athletes/${alumniId}`;
}

export async function POST(request: Request) {
  const viewer = await getMessageViewer();
  if (!viewer) {
    return NextResponse.redirect(new URL("/alumni-login", request.url), { status: 303 });
  }

  const form = await request.formData();
  const targetId = String(form.get("alumniId") ?? "").trim();
  const viewerAlumniId = linkedAlumniIdForViewer({
    alumniId: viewer.alumniId,
    username: viewer.label,
    label: viewer.label,
  });
  if (
    !canMessageHoyaProfile({
      viewerAlumniId,
      targetAlumniId: targetId,
      isAdmin: Boolean(viewer.isAdmin),
    })
  ) {
    return NextResponse.redirect(new URL(targetId ? profilePath(targetId, request) : "/directory", request.url), {
      status: 303,
    });
  }

  const fromId = dmParticipantId(viewer);
  if (!fromId) {
    return NextResponse.redirect(new URL(targetId ? profilePath(targetId, request) : "/directory", request.url), {
      status: 303,
    });
  }

  try {
    const person = await getLockerPersonById(targetId);
    if (!person) {
      return NextResponse.redirect(new URL("/directory", request.url), { status: 303 });
    }
    const channel = await findOrCreateDmChannel({
      fromAlumniId: fromId,
      toAlumniId: person.id,
      fromLabel: dmAuthorLabel(viewer),
      toLabel: displayName(toNameFields(person)),
      viewerKey: viewer.viewerKey,
    });
    return NextResponse.redirect(new URL(`/messages/${channel.slug}`, request.url), { status: 303 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.redirect(new URL(profilePath(targetId, request), request.url), { status: 303 });
    }
    throw error;
  }
}
