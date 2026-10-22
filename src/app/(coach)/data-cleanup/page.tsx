import { DataCleanupPanel } from "@/components/data-cleanup-panel";
import { SiteHeader } from "@/components/site-header";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { listCleanupSuggestions } from "@/lib/data-cleanup";
import { ensureDataCleanupTables } from "@/lib/data-cleanup-schema";
import { isMissingDatabaseConfig } from "@/lib/db";
import { requirePlatformRole } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function DataCleanupPage() {
  await requirePlatformRole(["admin"]);
  let suggestions: Awaited<ReturnType<typeof listCleanupSuggestions>> = [];
  let errorMessage: string | null = null;

  try {
    await ensureDataCleanupTables();
    suggestions = await listCleanupSuggestions("pending");
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load Data Cleanup.";
  }

  return (
    <PageShell>
      <SiteHeader current="data-cleanup" />
      <PageMain>
        <PageHeader
          eyebrow="Admin"
          title="Data Cleanup"
          description="AI-assisted duplicate alumni review. Run a scan, then approve merges into the keeper record or reject false matches. Admin login only."
        />
        {errorMessage ? (
          <StatusCard title="Data Cleanup unavailable" body={errorMessage} />
        ) : (
          <DataCleanupPanel initialSuggestions={suggestions} />
        )}
      </PageMain>
    </PageShell>
  );
}
