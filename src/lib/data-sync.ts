import {
  APPLY_BATCH_SIZE,
  MAX_IMPORT_DRAFTS,
  applyStagedRows,
  buildPreviewSamples,
  contactCounts,
  loadExistingAlumni,
  planDraftMatches,
  planToStagedRows,
  stagedRowsFromPayload,
  type AlumniDraft,
  type SheetCount,
} from "@/lib/alumni-import";
import type {
  DataSyncBatch,
  DataSyncPreview,
  DataSyncSample,
  DataSyncSheetCount,
  DataSyncStatus,
} from "@/lib/data-sync-types";
import { getSql } from "@/lib/db";
import { fetchAndMergeGuhoyasRosters } from "@/lib/guhoyas-roster";

export type { DataSyncBatch, DataSyncPreview, DataSyncStatus } from "@/lib/data-sync-types";

const BATCH_COLUMNS = `
  id, filename, content_type, status, sheet_counts, preview,
  row_count, insert_count, update_count, email_count, phone_count, roster_count,
  apply_offset, applied_insert_count, applied_update_count, applied_email_count,
  applied_phone_count, applied_roster_count, errors, created_by, created_at, updated_at, applied_at
`;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asSheetCounts(value: unknown): DataSyncSheetCount[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DataSyncSheetCount => {
    return Boolean(item && typeof item === "object" && "name" in item && "rows" in item);
  });
}

function asPreview(value: unknown): DataSyncPreview {
  if (!value || typeof value !== "object") return { samples: [], warnings: [] };
  const preview = value as { samples?: unknown; warnings?: unknown };
  return {
    samples: Array.isArray(preview.samples) ? (preview.samples as DataSyncSample[]) : [],
    warnings: asStringArray(preview.warnings),
  };
}

function mapBatch(row: Record<string, unknown>): DataSyncBatch {
  return {
    id: String(row.id),
    filename: String(row.filename),
    content_type: typeof row.content_type === "string" ? row.content_type : null,
    status: (row.status as DataSyncStatus) || "staged",
    sheet_counts: asSheetCounts(row.sheet_counts),
    preview: asPreview(row.preview),
    row_count: Number(row.row_count ?? 0),
    insert_count: Number(row.insert_count ?? 0),
    update_count: Number(row.update_count ?? 0),
    email_count: Number(row.email_count ?? 0),
    phone_count: Number(row.phone_count ?? 0),
    roster_count: Number(row.roster_count ?? 0),
    apply_offset: Number(row.apply_offset ?? 0),
    applied_insert_count: Number(row.applied_insert_count ?? 0),
    applied_update_count: Number(row.applied_update_count ?? 0),
    applied_email_count: Number(row.applied_email_count ?? 0),
    applied_phone_count: Number(row.applied_phone_count ?? 0),
    applied_roster_count: Number(row.applied_roster_count ?? 0),
    errors: asStringArray(row.errors),
    created_by: typeof row.created_by === "string" ? row.created_by : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    applied_at: row.applied_at ? String(row.applied_at) : null,
  };
}

export async function listDataSyncBatches(limit = 12): Promise<DataSyncBatch[]> {
  const sql = getSql();
  const rows = (await sql.query(
    `SELECT ${BATCH_COLUMNS}
     FROM data_sync
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  )) as Record<string, unknown>[];
  return rows.map(mapBatch);
}

export async function getDataSyncBatch(id: string): Promise<DataSyncBatch | null> {
  const sql = getSql();
  const rows = (await sql.query(
    `SELECT ${BATCH_COLUMNS}
     FROM data_sync
     WHERE id = $1`,
    [id],
  )) as Record<string, unknown>[];
  return rows[0] ? mapBatch(rows[0]) : null;
}

export async function createDataSyncBatch(input: {
  filename: string;
  contentType: string | null;
  drafts: AlumniDraft[];
  sheetCounts: SheetCount[] | DataSyncSheetCount[];
  warnings: string[];
  createdBy: string | null;
}): Promise<DataSyncBatch> {
  if (input.drafts.length === 0) {
    throw new Error("No alumni rows were parsed from that file.");
  }
  if (input.drafts.length > MAX_IMPORT_DRAFTS) {
    throw new Error(`This file has ${input.drafts.length} people. Split it below ${MAX_IMPORT_DRAFTS.toLocaleString()}.`);
  }

  const sql = getSql();
  const existing = await loadExistingAlumni(sql);
  const plan = planDraftMatches(existing, input.drafts);
  const contacts = contactCounts(input.drafts);
  const preview: DataSyncPreview = {
    samples: buildPreviewSamples(plan),
    warnings: input.warnings,
  };

  const rows = (await sql.query(
    `INSERT INTO data_sync (
      filename, content_type, status, sheet_counts, preview, payload,
      row_count, insert_count, update_count, email_count, phone_count, roster_count, created_by
    ) VALUES (
      $1, $2, 'staged', $3::jsonb, $4::jsonb, $5::jsonb,
      $6, $7, $8, $9, $10, $11, $12
    )
    RETURNING ${BATCH_COLUMNS}`,
    [
      input.filename,
      input.contentType,
      JSON.stringify(input.sheetCounts),
      JSON.stringify(preview),
      JSON.stringify(planToStagedRows(plan)),
      input.drafts.length,
      plan.toInsert.length,
      plan.toUpdate.length,
      contacts.emails,
      contacts.phones,
      contacts.rosterYears,
      input.createdBy,
    ],
  )) as Record<string, unknown>[];

  return mapBatch(rows[0]!);
}

export async function applyDataSyncBatch(id: string): Promise<{ batch: DataSyncBatch; done: boolean }> {
  const sql = getSql();
  const rows = (await sql.query(
    `SELECT ${BATCH_COLUMNS}, payload
     FROM data_sync
     WHERE id = $1`,
    [id],
  )) as Array<Record<string, unknown> & { payload: unknown }>;
  const row = rows[0];
  if (!row) {
    throw new Error("That sync batch was not found.");
  }

  const batch = mapBatch(row);
  if (batch.status === "applied") {
    return { batch, done: true };
  }

  const payload = stagedRowsFromPayload(row.payload);
  const offset = batch.apply_offset;
  if (offset >= payload.length) {
    const finished = (await sql.query(
      `UPDATE data_sync
       SET status = 'applied', applied_at = COALESCE(applied_at, now()), updated_at = now()
       WHERE id = $1
       RETURNING ${BATCH_COLUMNS}`,
      [id],
    )) as Record<string, unknown>[];
    try {
      await fetchAndMergeGuhoyasRosters(sql);
    } catch {
      // Workbook rows already applied; roster refresh is best-effort.
    }
    const refreshed = (await sql.query(
      `SELECT ${BATCH_COLUMNS} FROM data_sync WHERE id = $1`,
      [id],
    )) as Record<string, unknown>[];
    return { batch: mapBatch(refreshed[0] ?? finished[0]!), done: true };
  }

  const slice = payload.slice(offset, offset + APPLY_BATCH_SIZE);
  await sql.query(
    `UPDATE data_sync SET status = 'applying', updated_at = now() WHERE id = $1`,
    [id],
  );

  try {
    const result = await applyStagedRows(sql, slice);
    const nextOffset = offset + slice.length;
    const done = nextOffset >= payload.length;
    const updated = (await sql.query(
      `UPDATE data_sync SET
        status = $2,
        apply_offset = $3,
        applied_insert_count = applied_insert_count + $4,
        applied_update_count = applied_update_count + $5,
        applied_email_count = applied_email_count + $6,
        applied_phone_count = applied_phone_count + $7,
        applied_roster_count = applied_roster_count + $8,
        applied_at = CASE WHEN $9 THEN now() ELSE applied_at END,
        updated_at = now()
       WHERE id = $1
       RETURNING ${BATCH_COLUMNS}`,
      [
        id,
        done ? "applied" : "applying",
        nextOffset,
        result.inserted,
        result.updated,
        result.emails,
        result.phones,
        result.rosterYears,
        done,
      ],
    )) as Record<string, unknown>[];

    // After a full successful apply, re-scrape GUHoyas roster years into alumni.
    // Failures here do not roll back the workbook apply; they are logged on the batch.
    if (done) {
      try {
        const roster = await fetchAndMergeGuhoyasRosters(sql);
        if (roster.failed.length > 0) {
          await sql.query(
            `UPDATE data_sync
             SET errors = COALESCE(errors, '[]'::jsonb) || $2::jsonb,
                 updated_at = now()
             WHERE id = $1`,
            [
              id,
              JSON.stringify([
                `guhoyas_roster: merged ${roster.uniquePlayers} players ` +
                  `(+${roster.inserted}/~${roster.updated}); ` +
                  `${roster.failed.length} year(s) skipped`,
              ]),
            ],
          );
        }
      } catch (rosterError) {
        const rosterMessage =
          rosterError instanceof Error ? rosterError.message : "GUHoyas roster merge failed";
        await sql.query(
          `UPDATE data_sync
           SET errors = COALESCE(errors, '[]'::jsonb) || $2::jsonb,
               updated_at = now()
           WHERE id = $1`,
          [id, JSON.stringify([`guhoyas_roster: ${rosterMessage}`])],
        );
      }
    }

    const refreshed = (await sql.query(
      `SELECT ${BATCH_COLUMNS}
       FROM data_sync WHERE id = $1`,
      [id],
    )) as Record<string, unknown>[];
    return { batch: mapBatch(refreshed[0] ?? updated[0]!), done };

  } catch (error) {
    const message = error instanceof Error ? error.message : "Apply failed";
    await sql.query(
      `UPDATE data_sync
       SET status = 'failed',
           errors = COALESCE(errors, '[]'::jsonb) || $2::jsonb,
           updated_at = now()
       WHERE id = $1`,
      [id, JSON.stringify([message])],
    );
    throw error;
  }
}
