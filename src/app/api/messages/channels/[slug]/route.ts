import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { jsonAccessDenied, parseMessagePostsQuery, serializeMessageChannel } from "@/lib/messages-api";
import { getMessageViewer } from "@/lib/messages-auth";
import { canPostToMessageChannel, dmParticipantId } from "@/lib/messages-dm";
import { getViewerMessageChannel, listMessagePostsPage, markChannelReadForViewer } from "@/lib/messages";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const viewer = await getMessageViewer();
  const { slug } = await params;
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const query = parseMessagePostsQuery(url.searchParams);
  const markRead = url.searchParams.get("markRead") === "1";

  try {
    const channel = await getViewerMessageChannel(slug, viewer);
    const denied = jsonAccessDenied({ viewer, channel, action: "read" });
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    const page = await listMessagePostsPage(channel.id, query);
    if (markRead) {
      await markChannelReadForViewer(channel.id, viewer);
    }

    return NextResponse.json({
      channel: serializeMessageChannel(channel, dmParticipantId(viewer)),
      posts: page.posts,
      hasMoreBefore: page.hasMoreBefore,
      hasMoreAfter: page.hasMoreAfter,
      canPost: canPostToMessageChannel(channel, viewer),
    });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    throw error;
  }
}
