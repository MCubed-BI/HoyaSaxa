import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { listPublicBadgesFromFeed } from "@/lib/badges-attendance";
import { publicBadgesJson } from "@/lib/badges";
import { getCurrentViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ alumniId: string }> }) {
  const viewer = await getCurrentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { alumniId } = await params;
  if (!alumniId) return NextResponse.json({ error: "Missing alumniId" }, { status: 400 });

  try {
    const badges = publicBadgesJson(await listPublicBadgesFromFeed(alumniId));
    return NextResponse.json({ alumniId, badges });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ alumniId, badges: [] });
    }
    throw error;
  }
}
