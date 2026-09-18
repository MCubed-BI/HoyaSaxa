import { NextResponse } from "next/server";
import { MAX_IMPORT_FILE_BYTES, readAlumniWorkbook } from "@/lib/alumni-import";
import { getCoachCredentials } from "@/lib/auth";
import { applyDataSyncBatch, createDataSyncBatch, listDataSyncBatches } from "@/lib/data-sync";
import { ensureDataSyncTable } from "@/lib/data-sync-schema";
import { isMissingDatabaseConfig } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    await ensureDataSyncTable();
    const batches = await listDataSyncBatches();
    return NextResponse.json({ batches });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return jsonError("DATABASE_URL is not set.", 503);
    }
    const message = error instanceof Error ? error.message : "Could not load sync batches.";
    return jsonError(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDataSyncTable();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("Choose an .xlsx or .csv file.", 400);
    }

    const filename = file.name || "upload.xlsx";
    const lower = filename.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls") && !lower.endsWith(".csv")) {
      return jsonError("Upload an Excel workbook (.xlsx) or CSV.", 400);
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      return jsonError("That file is larger than 8 MB. Split it and try again.", 400);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const parsed = readAlumniWorkbook(bytes, filename);
    if (parsed.drafts.length === 0) {
      return jsonError(parsed.warnings[0] || "No alumni rows were parsed from that file.", 400);
    }

    const batch = await createDataSyncBatch({
      filename,
      contentType: file.type || null,
      drafts: parsed.drafts,
      sheetCounts: parsed.sheetCounts,
      warnings: parsed.warnings,
      createdBy: getCoachCredentials().username,
    });

    const applyNow = String(form.get("apply") ?? "") === "1";
    if (!applyNow) {
      return NextResponse.json({ batch });
    }

    let current = batch;
    let done = false;
    while (!done) {
      const result = await applyDataSyncBatch(current.id);
      current = result.batch;
      done = result.done;
    }
    return NextResponse.json({ batch: current });
  } catch (error) {
    if (isMissingDatabaseConfig(error)) {
      return jsonError("DATABASE_URL is not set.", 503);
    }
    const message = error instanceof Error ? error.message : "Upload failed.";
    return jsonError(message, 500);
  }
}
