import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  resolveAlumniMeIdentity,
  updateClaimedRecord,
  updateOwnAlumniRecord,
  type AlumniEditInput,
} from "@/lib/alumni-claim";
import { parseAlumniPhotoPatch, updateAlumniPhotos } from "@/lib/alumni-photos";
import { isMissingDatabaseConfig } from "@/lib/db";
import { optionalStringField, refreshFromLinkedinFlag, syncLinkedinPhotoOnSave } from "@/lib/linkedin-photo-sync";
import { canEditAlumniRecord } from "@/lib/platform-roles";
import { getCurrentViewer } from "@/lib/viewer";

export async function POST(request: Request) {
  try {
    const jar = await cookies();
    const viewer = await getCurrentViewer();
    const identity = await resolveAlumniMeIdentity(jar);
    if (!viewer && !identity.hasAlumSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as {
      alumniId?: string;
      patch?: AlumniEditInput & Record<string, unknown>;
      refreshFromLinkedin?: boolean;
    };
    if (!body.alumniId) return NextResponse.json({ error: "Missing alumniId" }, { status: 400 });

    const selfOrAdmin =
      (viewer && canEditAlumniRecord(viewer.platformRole, viewer.alumniId, body.alumniId)) ||
      Boolean(identity.alumniId && identity.alumniId === body.alumniId);

    if (selfOrAdmin) {
      await updateOwnAlumniRecord(body.alumniId, body.patch ?? {});
    } else if (identity.accountId) {
      await updateClaimedRecord(identity.accountId, body.alumniId, body.patch ?? {});
    } else {
      return NextResponse.json(
        { error: "Only the claimed alumnus or an admin can edit this record." },
        { status: 403 },
      );
    }

    const patch = body.patch ?? {};
    const photoPatch = parseAlumniPhotoPatch(patch);
    if ("football_photo_url" in photoPatch) {
      await updateAlumniPhotos(body.alumniId, { football_photo_url: photoPatch.football_photo_url });
    }
    const refresh = refreshFromLinkedinFlag(body) || refreshFromLinkedinFlag(patch);
    if (!("linkedin_url" in patch) && !("linkedin_photo_url" in patch) && !refresh) {
      return NextResponse.json({ ok: true });
    }
    const synced = await syncLinkedinPhotoOnSave({
      alumniId: body.alumniId,
      incomingPhoto: optionalStringField(patch, "linkedin_photo_url"),
      incomingProfileUrl: optionalStringField(patch, "linkedin_url"),
      refreshFromLinkedin: refresh,
    });
    return NextResponse.json({ ok: true, photos: synced.photos, linkedinPhoto: synced.linkedinPhoto });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Update failed";
    const status = message.includes("admin") || message.includes("claimed") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
