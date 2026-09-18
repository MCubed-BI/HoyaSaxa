import { NextResponse } from "next/server";
import { getDataSyncBatch } from "@/lib/data-sync";
import { ensureDataSyncTable } from "@/lib/data-sync-schema";
import { isMissingDatabaseConfig } from "@/lib/db";
import { hasStaffSession, staffUnauthorized } from "@/lib/messages-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasStaffSession())) return staffUnauthorized();
  try {
    await ensureDataSyncTable();
    const { id } = await params;
    const batch = await getDataSyncBatch(id);
    if (!batch) {
      return NextResponse.json({ error: "That sync batch was not found." }, { status: 404 });
    }
    return NextResponse.json({ batch });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set." }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Could not load that batch.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
