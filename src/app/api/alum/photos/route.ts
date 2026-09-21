import { NextResponse } from "next/server";
import { getAthleteActor } from "@/lib/athlete-access";
import { isMissingDatabaseConfig } from "@/lib/db";
import { getAlumniPhotos, parseAlumniPhotoPatch, updateAlumniPhotos } from "@/lib/alumni-photos";
import { optionalStringField, refreshFromLinkedinFlag, syncLinkedinPhotoOnSave } from "@/lib/linkedin-photo-sync";
import { getCurrentViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alumniId = new URL(request.url).searchParams.get("alumniId")?.trim() || viewer.alumniId;
  if (!alumniId) return NextResponse.json({ error: "Missing alumniId" }, { status: 400 });

  try {
    const photos = await getAlumniPhotos(alumniId);
    if (!photos) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ photos });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const alumniId = typeof body.alumniId === "string" ? body.alumniId.trim() : "";
  if (!alumniId) return NextResponse.json({ error: "Missing alumniId" }, { status: 400 });

  try {
    const actor = await getAthleteActor(alumniId);
    if (!actor.canEdit) {
      return NextResponse.json(
        { error: "Only the claimed alumnus or an admin can edit photo fields." },
        { status: 403 },
      );
    }
    const photoPatch = parseAlumniPhotoPatch(body);
    if ("football_photo_url" in photoPatch) {
      await updateAlumniPhotos(alumniId, { football_photo_url: photoPatch.football_photo_url });
    }
    const refresh = refreshFromLinkedinFlag(body);
    if (!("linkedin_photo_url" in body) && !("linkedin_url" in body) && !refresh) {
      return NextResponse.json({ ok: true, photos: await getAlumniPhotos(alumniId) });
    }
    const synced = await syncLinkedinPhotoOnSave({
      alumniId,
      incomingPhoto: optionalStringField(body, "linkedin_photo_url"),
      incomingProfileUrl: optionalStringField(body, "linkedin_url"),
      refreshFromLinkedin: refresh,
    });
    return NextResponse.json({ ok: true, photos: synced.photos, linkedinPhoto: synced.linkedinPhoto });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Update failed";
    const status = message.includes("admin") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
