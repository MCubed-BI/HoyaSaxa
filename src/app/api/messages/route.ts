import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { dmUnreadTotal, serializeMessageChannel } from "@/lib/messages-api";
import { getMessageViewer } from "@/lib/messages-auth";
import { dmParticipantId } from "@/lib/messages-dm";
import { filterMessageChannels, listViewerMessageChannels, parseMessageFilter } from "@/lib/messages";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await getMessageViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const filter = parseMessageFilter(url.searchParams.get("filter") ?? undefined);
  const viewerAlumniId = dmParticipantId(viewer);

  try {
    const allChannels = await listViewerMessageChannels(viewer);
    const channels = filterMessageChannels(allChannels, filter);
    return NextResponse.json({
      channels: channels.map((channel) => serializeMessageChannel(channel, viewerAlumniId)),
      unreadTotal: dmUnreadTotal(allChannels),
      filter,
    });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ channels: [], unreadTotal: 0, filter });
    }
    throw error;
  }
}
