import { NextResponse } from "next/server";
import { displayName } from "@/lib/format";
import { isMissingDatabaseConfig } from "@/lib/db";
import { toNameFields } from "@/lib/locker-classify";
import { getLockerPersonById } from "@/lib/locker-directory";
import { isMessageableAlumniId, listMessageChannelsOptions, serializeMessageChannel, wantsJsonRequest } from "@/lib/messages-api";
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

function fail(request: Request, path: string, json: boolean, status: number, error: string) {
  if (json) return NextResponse.json({ error }, { status });
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

async function readAlumniId(request: Request) {
  const json = wantsJsonRequest(request) || (request.headers.get("content-type") ?? "").includes("application/json");
  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as { alumniId?: string };
    return { alumniId: String(body.alumniId ?? "").trim(), json: true };
  }
  const form = await request.formData();
  return { alumniId: String(form.get("alumniId") ?? "").trim(), json };
}

export async function POST(request: Request) {
  const viewer = await getMessageViewer();
  const input = await readAlumniId(request);
  if (!viewer) {
    return fail(request, "/home/login?next=/messages", input.json, 401, "Unauthorized");
  }

  const targetId = input.alumniId;
  const viewerAlumniId = linkedAlumniIdForViewer({
    alumniId: viewer.alumniId,
    username: viewer.label,
    label: viewer.label,
  });
  if (
    !isMessageableAlumniId(targetId) ||
    !canMessageHoyaProfile({
      viewerAlumniId,
      targetAlumniId: targetId,
      isAdmin: Boolean(viewer.isAdmin),
    })
  ) {
    return fail(
      request,
      targetId ? profilePath(targetId, request) : "/directory",
      input.json,
      400,
      "You can't message this person.",
    );
  }

  const fromId = dmParticipantId(viewer);
  if (!fromId) {
    return fail(
      request,
      targetId ? profilePath(targetId, request) : "/directory",
      input.json,
      403,
      "Sign in with a claimed Hoya record to send a direct message.",
    );
  }

  try {
    const person = await getLockerPersonById(targetId);
    if (!person) {
      return fail(request, "/directory", input.json, 404, "Person not found.");
    }
    const channel = await findOrCreateDmChannel({
      fromAlumniId: fromId,
      toAlumniId: person.id,
      fromLabel: dmAuthorLabel(viewer),
      toLabel: displayName(toNameFields(person)),
      viewerKey: viewer.viewerKey,
      listOptions: listMessageChannelsOptions(viewer),
    });
    if (input.json) {
      return NextResponse.json({ ok: true, channel: serializeMessageChannel(channel, fromId) });
    }
    return NextResponse.redirect(new URL(`/messages/${channel.slug}`, request.url), { status: 303 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return fail(request, profilePath(targetId, request), input.json, 503, "DATABASE_URL is not set");
    }
    throw error;
  }
}
