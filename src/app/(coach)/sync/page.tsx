import { AppHeader } from "@/components/app-header";
import { DataSyncPanel } from "@/components/data-sync-panel";
import { StatusCard } from "@/components/status-card";
import { listDataSyncBatches, type DataSyncBatch } from "@/lib/data-sync";
import { ensureDataSyncTable } from "@/lib/data-sync-schema";
import { isMissingDatabaseConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
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
    <div className="flex min-h-full flex-col">
      <AppHeader current="sync" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Admin
          </p>
          <h2 className="font-heading text-3xl text-navy">Data Sync</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Upload a workbook, preview who will be updated or added, then apply the staged batch
            to the live Neon alumni tables. Existing records are merged, not replaced.
          </p>
        </div>
        {errorMessage ? (
          <StatusCard title="Data Sync unavailable" body={errorMessage} />
        ) : (
          <DataSyncPanel initialBatches={batches} />
        )}
      </main>
    </div>
  );
}
