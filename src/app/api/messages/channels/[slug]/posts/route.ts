import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getMessageViewer } from "@/lib/messages-auth";
import { canPostToMessageChannel, dmAuthorLabel, dmParticipantId, isDmChannel } from "@/lib/messages-dm";
import { createMessagePost, getMessageChannel } from "@/lib/messages";

function channelPath(slug: string) {
  return `/messages/${slug}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const viewer = await getMessageViewer();
  const { slug } = await params;
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "");
  const body = String(form.get("body") ?? "").trim();
  if (!body) {
    return NextResponse.redirect(new URL(channelPath(slug), request.url), { status: 303 });
  }

  try {
    const channel = await getMessageChannel(slug, viewer.viewerKey, dmParticipantId(viewer));
    if (!channel || !canPostToMessageChannel(channel, viewer)) {
      if (!channel) {
        return NextResponse.redirect(new URL("/messages", request.url), { status: 303 });
      }
      return NextResponse.redirect(new URL(channelPath(slug), request.url), { status: 303 });
    }
    await createMessagePost({
      channelId: channel.id,
      title,
      body,
      authorRole: isDmChannel(channel) ? (viewer.isAdmin && !viewer.alumniId ? "admin" : viewer.kind) : "staff",
      authorLabel: isDmChannel(channel) ? dmAuthorLabel(viewer) : viewer.label,
    });
    return NextResponse.redirect(new URL(channelPath(slug), request.url), { status: 303 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.redirect(new URL(channelPath(slug), request.url), { status: 303 });
    }
    throw error;
  }
}
