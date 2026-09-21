import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loadAlumniMeState } from "@/lib/alumni-claim";
import { isMissingDatabaseConfig } from "@/lib/db";

export async function GET() {
  try {
    const jar = await cookies();
    const state = await loadAlumniMeState(jar);
    if (!state) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = state.account?.email || state.identity.email || state.identity.name || "Alumnus";
    const netId = state.account?.netId ?? null;
    return NextResponse.json({
      account: state.account ?? {
        id: state.identity.accountId ?? state.identity.alumniId ?? "session",
        email,
        netId,
      },
      records: state.records,
      mergeCandidates: state.mergeCandidates,
      verifiedHoya: state.records.length > 0,
      mode: "alum",
    });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    throw error;
  }
}
