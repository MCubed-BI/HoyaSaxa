import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { jsonAccessDenied } from "@/lib/messages-api";
import { getMessageViewer } from "@/lib/messages-auth";
import { getViewerMessageChannel, markChannelReadForViewer } from "@/lib/messages";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const viewer = await getMessageViewer();
  const { slug } = await params;
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const channel = await getViewerMessageChannel(slug, viewer);
    const denied = jsonAccessDenied({ viewer, channel, action: "read" });
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    await markChannelReadForViewer(channel.id, viewer);
    return NextResponse.json({ ok: true, slug: channel.slug });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    throw error;
  }
}
