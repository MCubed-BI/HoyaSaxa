import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { dmUnreadTotal } from "@/lib/messages-api";
import { getMessageViewer } from "@/lib/messages-auth";
import { listViewerMessageChannels } from "@/lib/messages";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getMessageViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const channels = await listViewerMessageChannels(viewer);
    return NextResponse.json({ count: dmUnreadTotal(channels) });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ count: 0 });
    }
    throw error;
  }
}
