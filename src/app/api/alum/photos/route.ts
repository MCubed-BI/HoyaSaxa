import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import {
  assertCanEditAlumniPhotos,
  getAlumniPhotos,
  parseAlumniPhotoPatch,
  updateAlumniPhotos,
} from "@/lib/alumni-photos";
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
    assertCanEditAlumniPhotos({
      role: viewer.platformRole,
      actorAlumniId: viewer.alumniId,
      targetAlumniId: alumniId,
    });
    const photos = await updateAlumniPhotos(alumniId, parseAlumniPhotoPatch(body));
    return NextResponse.json({ ok: true, photos });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Update failed";
    const status = message.includes("admin") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
