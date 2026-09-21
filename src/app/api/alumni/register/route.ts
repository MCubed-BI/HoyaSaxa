import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { alumSessionIdentityForAccount, registerAlumniAccount } from "@/lib/alumni-claim";
import { photoPatchFromRegisterBody, profileUrlFromRegisterBody } from "@/lib/claim-photos";
import { syncLinkedinPhotoOnSave } from "@/lib/linkedin-photo-sync";
import { setAlumSessionCookies } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      lastName?: string;
      classYear?: string;
      email?: string;
      password?: string;
      alumniIds?: string[];
      firstName?: string;
      createIfMissing?: boolean;
      football_photo_url?: string;
      linkedin_photo_url?: string;
      linkedin_url?: string;
    };
    const photos = photoPatchFromRegisterBody(body);
    const linkedinUrl = profileUrlFromRegisterBody(body);
    const result = await registerAlumniAccount({
      lastName: body.lastName ?? "",
      classYear: body.classYear ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      alumniIds: Array.isArray(body.alumniIds) ? body.alumniIds : [],
      firstName: body.firstName,
      createIfMissing: Boolean(body.createIfMissing),
      photos: Object.keys(photos).length > 0 ? photos : undefined,
      linkedinUrl,
    });
    let linkedinPhoto = null;
    let savedPhotos = null;
    for (const alumniId of result.claimedIds) {
      const synced = await syncLinkedinPhotoOnSave({
        alumniId,
        incomingPhoto: typeof body.linkedin_photo_url === "string" ? body.linkedin_photo_url : undefined,
        incomingProfileUrl: linkedinUrl ?? undefined,
      });
      linkedinPhoto ??= synced.linkedinPhoto;
      savedPhotos = synced.photos;
    }
    const response = NextResponse.json({
      ok: true,
      role: "alum",
      verifiedHoya: true,
      mode: "alum",
      claimedIds: result.claimedIds,
      classYear: result.classYear,
      email: result.account.email,
      netId: result.account.netId,
      photos: savedPhotos,
      linkedinPhoto,
    });
    setAlumSessionCookies(response, await alumSessionIdentityForAccount(result.account));
    return response;
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
