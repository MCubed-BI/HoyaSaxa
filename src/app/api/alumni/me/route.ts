import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ALUMNI_SESSION_COOKIE, readAlumniSessionAccountId } from "@/lib/alumni-auth";
import { findSameLastNameCandidates, getAccountById, getClaimedRecords } from "@/lib/alumni-claim";
import { isMissingDatabaseConfig } from "@/lib/db";

export async function GET() {
  try {
    const jar = await cookies();
    const accountId = readAlumniSessionAccountId(jar.get(ALUMNI_SESSION_COOKIE)?.value);
    if (!accountId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const account = await getAccountById(accountId);
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const records = await getClaimedRecords(accountId);
    const lastName = records[0]?.last_name ?? "";
    const mergeCandidates = lastName
      ? await findSameLastNameCandidates(
          lastName,
          accountId,
          records.map((row) => row.id),
        )
      : [];
    return NextResponse.json({ account, records, mergeCandidates });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    throw error;
  }
}
