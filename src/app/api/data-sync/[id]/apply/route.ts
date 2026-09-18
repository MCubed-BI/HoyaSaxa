import { NextResponse } from "next/server";
import { applyDataSyncBatch } from "@/lib/data-sync";
import { ensureDataSyncTable } from "@/lib/data-sync-schema";
import { isMissingDatabaseConfig } from "@/lib/db";
import { hasStaffSession, staffUnauthorized } from "@/lib/messages-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasStaffSession())) return staffUnauthorized();
  try {
    await ensureDataSyncTable();
    const { id } = await params;
    const result = await applyDataSyncBatch(id);
    return NextResponse.json({
      batch: result.batch,
      done: result.done,
    });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return NextResponse.json({ error: "DATABASE_URL is not set." }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Apply failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
