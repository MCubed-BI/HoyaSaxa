import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { accountIdFromCookies, updateClaimedRecord, type AlumniEditInput } from "@/lib/alumni-claim";
import { parseAlumniPhotoPatch, updateAlumniPhotos } from "@/lib/alumni-photos";
import { isMissingDatabaseConfig } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const jar = await cookies();
    const accountId = await accountIdFromCookies(jar);
    if (!accountId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as { alumniId?: string; patch?: AlumniEditInput & Record<string, unknown> };
    if (!body.alumniId) return NextResponse.json({ error: "Missing alumniId" }, { status: 400 });
    await updateClaimedRecord(accountId, body.alumniId, body.patch ?? {});
    const photoPatch = parseAlumniPhotoPatch(body.patch ?? {});
    if (Object.keys(photoPatch).length > 0) {
      await updateAlumniPhotos(body.alumniId, photoPatch);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
