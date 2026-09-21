import { NextResponse } from "next/server";
import { displayName } from "@/lib/format";
import { isMissingDatabaseConfig } from "@/lib/db";
import { toNameFields } from "@/lib/locker-classify";
import { getLockerPersonById } from "@/lib/locker-directory";
import { getMessageViewer } from "@/lib/messages-auth";
import { canMessageHoyaProfile } from "@/lib/messages-dm";
import { findOrCreateDmChannel } from "@/lib/messages";

function athletePath(alumniId: string) {
  return `/athletes/${alumniId}`;
}

export async function POST(request: Request) {
  const viewer = await getMessageViewer();
  if (!viewer) {
    return NextResponse.redirect(new URL("/alumni-login", request.url), { status: 303 });
  }

  const form = await request.formData();
  const targetId = String(form.get("alumniId") ?? "").trim();
  if (!canMessageHoyaProfile({ viewerAlumniId: viewer.alumniId, targetAlumniId: targetId })) {
    return NextResponse.redirect(new URL(targetId ? athletePath(targetId) : "/directory", request.url), {
      status: 303,
    });
  }

  try {
    const person = await getLockerPersonById(targetId);
    if (!person) {
      return NextResponse.redirect(new URL("/directory", request.url), { status: 303 });
    }
    const channel = await findOrCreateDmChannel({
      fromAlumniId: viewer.alumniId as string,
      toAlumniId: person.id,
      fromLabel: viewer.label,
      toLabel: displayName(toNameFields(person)),
      viewerKey: viewer.viewerKey,
    });
    return NextResponse.redirect(new URL(`/messages/${channel.slug}`, request.url), { status: 303 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.redirect(new URL(athletePath(targetId), request.url), { status: 303 });
    }
    throw error;
  }
}
