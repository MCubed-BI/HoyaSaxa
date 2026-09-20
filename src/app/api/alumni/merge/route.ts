import { NextResponse } from "next/server";
import { claimAdditionalRecord, mergeAlumniPair } from "@/lib/alumni-claim";
import { getAthleteActor } from "@/lib/athlete-access";
import { isMissingDatabaseConfig } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "claim" | "merge";
      alumniId?: string;
      keeperId?: string;
      sourceId?: string;
    };

    if (body.action === "claim") {
      if (!body.alumniId) return NextResponse.json({ error: "Missing alumniId" }, { status: 400 });
      const actor = await getAthleteActor(body.alumniId);
      if (!actor.accountId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      await claimAdditionalRecord(actor.accountId, body.alumniId);
      return NextResponse.json({ ok: true });
    }

    if (!body.keeperId || !body.sourceId) {
      return NextResponse.json({ error: "Choose a record to keep and a record to merge." }, { status: 400 });
    }
    const actor = await getAthleteActor(body.keeperId);
    if (!actor.canMerge) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await mergeAlumniPair({
      keeperId: body.keeperId,
      sourceId: body.sourceId,
      accountId: actor.accountId,
      asAdmin: actor.isAdmin,
      sessionAlumniId: actor.sessionAlumniId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Merge failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
