import { FindMyAlumMap } from "@/components/find-my-alum-map";
import { SiteHeader } from "@/components/site-header";
import { StatusCard } from "@/components/status-card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { listAlumniLocations } from "@/lib/portal-queries";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function FindMyAlumPage() {
  await requireViewer();
  let errorMessage: string | null = null;
  let groups: Awaited<ReturnType<typeof listAlumniLocations>> = [];

  try {
    groups = await listAlumniLocations();
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load locations.";
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader current="find-my-alum" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Directory</p>
          <h2 className="font-heading text-3xl text-navy">Find My Alum</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Location groups from current city/state. If a Find My Alum map is already present on
            another branch, keep that map and mount it in this slot — this page only extends it.
          </p>
        </div>
        {errorMessage ? (
          <StatusCard title="Find My Alum unavailable" body={errorMessage} />
        ) : (
          <FindMyAlumMap groups={groups} />
        )}
      </main>
    </div>
  );
}
