import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { canPostSgarlata, getMessageViewer } from "@/lib/messages-auth";
import { createMessagePost, getMessageChannel } from "@/lib/messages";

function channelPath(slug: string) {
  return `/messages/${slug}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const viewer = await getMessageViewer();
  const { slug } = await params;
  if (!viewer || !canPostSgarlata(viewer)) {
    if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL(channelPath(slug), request.url), { status: 303 });
  }

  const form = await request.formData();
  const title = String(form.get("title") ?? "");
  const body = String(form.get("body") ?? "").trim();
  if (!body) {
    return NextResponse.redirect(new URL(channelPath(slug), request.url), { status: 303 });
  }

  try {
    const channel = await getMessageChannel(slug, viewer.viewerKey);
    if (!channel) {
      return NextResponse.redirect(new URL("/messages", request.url), { status: 303 });
    }
    await createMessagePost({
      channelId: channel.id,
      title,
      body,
      authorRole: "staff",
      authorLabel: viewer.label,
    });
    return NextResponse.redirect(new URL(channelPath(slug), request.url), { status: 303 });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.redirect(new URL(channelPath(slug), request.url), { status: 303 });
    }
    throw error;
  }
}
