import { NextResponse } from "next/server";
import { isMissingDatabaseConfig } from "@/lib/db";
import { alumSessionIdentityForAccount, registerAlumniAccount } from "@/lib/alumni-claim";
import { photoPatchFromRegisterBody } from "@/lib/claim-photos";
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
    };
    const photos = photoPatchFromRegisterBody(body);
    const result = await registerAlumniAccount({
      lastName: body.lastName ?? "",
      classYear: body.classYear ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      alumniIds: Array.isArray(body.alumniIds) ? body.alumniIds : [],
      firstName: body.firstName,
      createIfMissing: Boolean(body.createIfMissing),
      photos: Object.keys(photos).length > 0 ? photos : undefined,
    });
    const response = NextResponse.json({
      ok: true,
      role: "alum",
      verifiedHoya: true,
      mode: "alum",
      claimedIds: result.claimedIds,
      classYear: result.classYear,
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
