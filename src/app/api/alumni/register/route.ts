import { NextResponse } from "next/server";
import {
  ALUMNI_SESSION_COOKIE,
  alumniSessionCookieOptions,
  createAlumniSessionToken,
} from "@/lib/alumni-auth";
import { isMissingDatabaseConfig } from "@/lib/db";
import { registerAlumniAccount } from "@/lib/alumni-claim";

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
    };
    const result = await registerAlumniAccount({
      lastName: body.lastName ?? "",
      classYear: body.classYear ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      alumniIds: Array.isArray(body.alumniIds) ? body.alumniIds : [],
      firstName: body.firstName,
      createIfMissing: Boolean(body.createIfMissing),
    });
    const response = NextResponse.json({
      ok: true,
      claimedIds: result.claimedIds,
      classYear: result.classYear,
    });
    response.cookies.set(ALUMNI_SESSION_COOKIE, createAlumniSessionToken(result.account.id), alumniSessionCookieOptions());
    return response;
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
