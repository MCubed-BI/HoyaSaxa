import { NextResponse } from "next/server";
import { alumAttendanceTotalsFromFeed, listEventCheckinFeed } from "@/lib/event-attendance-feed";
import { getEventActor } from "@/lib/event-actor";
import { isMissingDatabaseConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Coder 3 consume-only JSON. No badge UI.
 *   GET /api/events/attendance/feed
 *   GET /api/events/attendance/feed?alumId=<uuid>  → { alum, feed }
 */
export async function GET(request: Request) {
  const actor = await getEventActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  try {
    const alumId = url.searchParams.get("alumId") ?? undefined;
    const feed = await listEventCheckinFeed({
      eventId: url.searchParams.get("eventId") ?? undefined,
      alumId,
      userId: url.searchParams.get("userId") ?? undefined,
    });
    if (alumId && !url.searchParams.get("eventId")) {
      return NextResponse.json({
        alum: alumAttendanceTotalsFromFeed(alumId, feed),
        feed,
      });
    }
    return NextResponse.json(feed);
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Could not load attendance feed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
