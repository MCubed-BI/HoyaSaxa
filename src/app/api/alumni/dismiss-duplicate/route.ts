import { NextResponse } from "next/server";
import { dismissDuplicatePair, duplicateDismissalActorKey } from "@/lib/alumni-duplicate-dismissals";
import { getAthleteActor } from "@/lib/athlete-access";
import { isMissingDatabaseConfig } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { keeperId?: string; sourceId?: string };
    if (!body.keeperId || !body.sourceId) {
      return NextResponse.json({ error: "Choose the suggestion to dismiss." }, { status: 400 });
    }
    const actor = await getAthleteActor(body.keeperId);
    if (!actor.canMerge) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actorKey = duplicateDismissalActorKey(actor);
    if (!actorKey) {
      return NextResponse.json({ error: "Sign in to dismiss this suggestion." }, { status: 401 });
    }
    await dismissDuplicatePair({ keeperId: body.keeperId, sourceId: body.sourceId, actorKey });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Could not dismiss that suggestion.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
