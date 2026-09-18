import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ALUMNI_SESSION_COOKIE, readAlumniSessionAccountId } from "@/lib/alumni-auth";
import { updateClaimedRecord, type AlumniEditInput } from "@/lib/alumni-claim";
import { isMissingDatabaseConfig } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const jar = await cookies();
    const accountId = readAlumniSessionAccountId(jar.get(ALUMNI_SESSION_COOKIE)?.value);
    if (!accountId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as { alumniId?: string; patch?: AlumniEditInput };
    if (!body.alumniId) return NextResponse.json({ error: "Missing alumniId" }, { status: 400 });
    await updateClaimedRecord(accountId, body.alumniId, body.patch ?? {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
