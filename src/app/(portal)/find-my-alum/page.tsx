import { AdminAlumniMergeCard } from "@/components/admin-alumni-merge";
import { AlumniFiltersForm } from "@/components/alumni-filters";
import { FindMyAlumMapLoader } from "@/components/find-my-alum-map-loader";
import { AppHeader } from "@/components/app-header";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";
import { isMissingDatabaseConfig } from "@/lib/db";
import { parseAlumniFilters } from "@/lib/filters";
import { getAlumniFacets } from "@/lib/queries";
import { canUseOwnerTools } from "@/lib/roles";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function FindMyAlumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireViewer();
  const filters = parseAlumniFilters(await searchParams);
  let errorMessage: string | null = null;
  let facets: Awaited<ReturnType<typeof getAlumniFacets>> | null = null;

  // Facets only on the document request — map pins load via /api/find-my-alum/points
  // so the shell paints immediately instead of waiting on ~4k geocoded rows.
  try {
    facets = await getAlumniFacets();
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load locations.";
  }

  const body = (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Find My Alum"
        description="Current towns in navy, hometowns in gray. Filter All / Hometown / Current. Heat density uses city-level locations only (one per alum on All) so state estimates don’t inflate the map. Pins still show every place and jitter slightly so shared cities stay clickable."
      />
      {facets ? <AlumniFiltersForm filters={filters} facets={facets} action="/find-my-alum" /> : null}
      {viewer.platformRole === "admin" ? <AdminAlumniMergeCard /> : null}
      {errorMessage ? (
        <StatusCard title="Find My Alum unavailable" body={errorMessage} />
      ) : (
        <FindMyAlumMapLoader
          filters={filters}
          profileBase={canUseOwnerTools(viewer.role) ? "/alumni" : "/directory"}
        />
      )}
    </>
  );

  return (
    <PageShell>
      <AppHeader
        current="find-my-alum"
        role={viewer.role}
        viewerLabel={viewer.label}
        verifiedHoya={viewer.verifiedHoya}
      />
      <PageMain>{body}</PageMain>
    </PageShell>
  );
}
