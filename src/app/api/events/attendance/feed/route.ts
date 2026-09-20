import { NextResponse } from "next/server";
import { listAttendanceBadgeFeed } from "@/lib/event-attendance-feed";
import { getEventActor } from "@/lib/event-actor";
import { isMissingDatabaseConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Coder 3 consume-only JSON for attendance totals / ranks / percentiles.
 * Same shape as `listAttendanceBadgeFeed()` in `@/lib/event-attendance-feed`.
 */
export async function GET(request: Request) {
  const actor = await getEventActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  try {
    const feed = await listAttendanceBadgeFeed({
      eventId: url.searchParams.get("eventId") ?? undefined,
      alumId: url.searchParams.get("alumId") ?? undefined,
      userId: url.searchParams.get("userId") ?? undefined,
    });
    return NextResponse.json(feed);
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Could not load attendance feed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
