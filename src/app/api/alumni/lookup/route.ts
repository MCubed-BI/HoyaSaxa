import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { accountIdFromCookies, lookupRosterMatches, publicMatch } from "@/lib/alumni-claim";
import { isMissingDatabaseConfig } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { lastName?: string; classYear?: string };
    const jar = await cookies();
    const accountId = await accountIdFromCookies(jar);
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
