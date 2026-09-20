import { NextResponse } from "next/server";
import { ATTENDANCE_COUNT_SCOPE, listAttendanceLeaders } from "@/lib/event-attendance";
import { ATTENDANCE_RANK_BASIS } from "@/lib/event-attendance-feed";
import { getEventActor } from "@/lib/event-actor";
import { isMissingDatabaseConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getEventActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leaders = await listAttendanceLeaders(50);
    return NextResponse.json({
      attendanceCountScope: ATTENDANCE_COUNT_SCOPE,
      rankBasis: ATTENDANCE_RANK_BASIS,
      leaders,
    });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Could not load attendance ranks.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
