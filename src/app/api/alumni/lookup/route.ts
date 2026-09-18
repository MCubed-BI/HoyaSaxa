import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ALUMNI_SESSION_COOKIE, readAlumniSessionAccountId } from "@/lib/alumni-auth";
import { isMissingDatabaseConfig } from "@/lib/db";
import { lookupRosterMatches, publicMatch } from "@/lib/alumni-claim";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { lastName?: string; classYear?: string };
    const jar = await cookies();
    const accountId = readAlumniSessionAccountId(jar.get(ALUMNI_SESSION_COOKIE)?.value);
    const result = await lookupRosterMatches(body.lastName ?? "", body.classYear ?? "", accountId);
    return NextResponse.json({
      lastName: result.lastName,
      classYear: result.classYear,
      matches: result.matches.map(publicMatch),
    });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
