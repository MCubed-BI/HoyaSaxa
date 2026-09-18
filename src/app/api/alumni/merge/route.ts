import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { accountIdFromCookies, claimAdditionalRecord, mergeAlumniRecords } from "@/lib/alumni-claim";
import { isMissingDatabaseConfig } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const jar = await cookies();
    const accountId = await accountIdFromCookies(jar);
    if (!accountId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as {
      action?: "claim" | "merge";
      alumniId?: string;
      keeperId?: string;
      sourceId?: string;
    };
    if (body.action === "claim") {
      if (!body.alumniId) return NextResponse.json({ error: "Missing alumniId" }, { status: 400 });
      await claimAdditionalRecord(accountId, body.alumniId);
      return NextResponse.json({ ok: true });
    }
    if (!body.keeperId || !body.sourceId) {
      return NextResponse.json({ error: "Choose a record to keep and a record to merge." }, { status: 400 });
    }
    await mergeAlumniRecords(accountId, body.keeperId, body.sourceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Merge failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
