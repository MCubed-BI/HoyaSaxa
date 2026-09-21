import { NextResponse } from "next/server";
import { displayName } from "@/lib/format";
import { isMissingDatabaseConfig } from "@/lib/db";
import { toNameFields } from "@/lib/locker-classify";
import { getLockerPersonById } from "@/lib/locker-directory";
import { createMessagePost, findOrCreateDmChannel } from "@/lib/messages";
import { getMessageViewer } from "@/lib/messages-auth";
import { canMessageAthlete, messageAthleteHref, normalizeMessagingAlumniId } from "@/lib/messages-dm";

function threadPath(slug: string) {
  return `/messages/${slug}`;
}

async function readInput(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { recipientAlumniId?: string; body?: string };
    return {
      recipientAlumniId: String(body.recipientAlumniId ?? "").trim(),
      body: String(body.body ?? "").trim(),
    };
  }
  const form = await request.formData();
  return {
    recipientAlumniId: String(form.get("recipientAlumniId") ?? "").trim(),
    body: String(form.get("body") ?? "").trim(),
  };
}

export async function POST(request: Request) {
  const viewer = await getMessageViewer();
  const senderId = normalizeMessagingAlumniId(viewer?.alumniId);
  if (!viewer || !senderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = await readInput(request);
  if (!canMessageAthlete({ viewerAlumniId: senderId, recipientAlumniId: input.recipientAlumniId })) {
    return NextResponse.redirect(new URL("/messages", request.url), { status: 303 });
  }

  try {
    const person = await getLockerPersonById(input.recipientAlumniId);
    if (!person) {
      return NextResponse.redirect(new URL("/directory", request.url), { status: 303 });
    }

    const channel = await findOrCreateDmChannel({
      sender: { alumniId: senderId, name: viewer.label },
      recipient: { alumniId: person.id, name: displayName(toNameFields(person)) },
    });

    if (input.body) {
      await createMessagePost({
        channelId: channel.id,
        body: input.body,
        authorRole: viewer.kind === "staff" ? "staff" : "alum",
        authorLabel: viewer.label,
      });
    }

    return NextResponse.redirect(new URL(threadPath(channel.slug), request.url), { status: 303 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.redirect(new URL(messageAthleteHref(input.recipientAlumniId), request.url), { status: 303 });
    }
    throw error;
  }
}
