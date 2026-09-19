import { SiteHeader } from "@/components/site-header";
import { DataSyncPanel } from "@/components/data-sync-panel";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { listDataSyncBatches, type DataSyncBatch } from "@/lib/data-sync";
import { ensureDataSyncTable } from "@/lib/data-sync-schema";
import { isMissingDatabaseConfig } from "@/lib/db";
import { requireRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  await requireRole(["owner", "coach"]);
  let batches: DataSyncBatch[] = [];
  let errorMessage: string | null = null;

  try {
    await ensureDataSyncTable();
    batches = await listDataSyncBatches();
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load sync batches.";
  }

  return (
    <PageShell>
      <SiteHeader current="sync" />
      <PageMain>
        <PageHeader
          eyebrow="Admin"
          title="Data Sync"
          description="Upload a workbook, preview who will be updated or added, then apply the staged batch to the live Neon alumni tables. Existing records are merged, not replaced."
        />
        {errorMessage ? (
          <StatusCard title="Data Sync unavailable" body={errorMessage} />
        ) : (
          <DataSyncPanel initialBatches={batches} />
        )}
      </PageMain>
    </PageShell>
  );
}
