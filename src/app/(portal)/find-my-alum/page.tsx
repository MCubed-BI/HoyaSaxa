import { Suspense } from "react";
import { AlumniFilterChips } from "@/components/alumni-filter-chips";
import { AlumniFiltersForm } from "@/components/alumni-filters";
import { FindMyAlumMapLoader } from "@/components/find-my-alum-map-loader";
import { Kpi, KpiGrid } from "@/components/kpi";
import { PageHeader, PageMain, PageShell } from "@/components/page-chrome";
import { MapCanvasSkeleton } from "@/components/page-skeletons";
import { PortalShell } from "@/components/portal-shell";
import { EmptyState, ErrorState } from "@/components/query-state";
import { SiteHeader } from "@/components/site-header";
import { LoadedStamp } from "@/components/timestamp";
import { isMissingDatabaseConfig } from "@/lib/db";
import { parseAlumniFilters, type AlumniFilters } from "@/lib/filters";
import { formatCount, formatNumber } from "@/lib/format";
import { getAlumniMapPoints } from "@/lib/map-points";
import { getAlumniFacets } from "@/lib/queries";
import { canUseOwnerTools } from "@/lib/roles";
import { requireViewer, type Viewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function FindMyAlumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireViewer();
  const filters = parseAlumniFilters(await searchParams);

  const body = (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Find My Alum"
        description="Map and heat of alumni locations from current city/state, then hometown, then a parsed US address. Pins jitter slightly so people in the same city stay clickable."
      />
      <Suspense fallback={<MapCanvasSkeleton />}>
        <FindMyAlumBody viewer={viewer} filters={filters} />
      </Suspense>
    </>
  );

  if (viewer.role === "alum" || viewer.role === "board") {
    return (
      <PortalShell viewer={viewer} current="find-my-alum">
        {body}
      </PortalShell>
    );
  }

  return (
    <PageShell>
      <SiteHeader current="find-my-alum" />
      <PageMain>{body}</PageMain>
    </PageShell>
  );
}

async function FindMyAlumBody({
  viewer,
  filters,
}: {
  viewer: Viewer;
  filters: AlumniFilters;
}) {
  let errorMessage: string | null = null;
  let mapped: Awaited<ReturnType<typeof getAlumniMapPoints>> | null = null;
  let facets: Awaited<ReturnType<typeof getAlumniFacets>> | null = null;

  try {
    [mapped, facets] = await Promise.all([getAlumniMapPoints(filters), getAlumniFacets()]);
  } catch (error) {
    errorMessage = isMissingDatabaseConfig(error)
      ? "DATABASE_URL is not set. Add it to .env.local and reload."
      : error instanceof Error
        ? error.message
        : "Could not load locations.";
  }

  return (
    <>
      <AlumniFilterChips filters={filters} action="/find-my-alum" />
      {facets ? <AlumniFiltersForm filters={filters} facets={facets} action="/find-my-alum" /> : null}
      <LoadedStamp value={new Date().toISOString()} />
      {errorMessage ? (
        <ErrorState title="Find My Alum unavailable" body={errorMessage} />
      ) : mapped ? (
        <>
          <KpiGrid>
            <Kpi tone="primary" icon="map" label="Mapped" value={formatNumber(mapped.mappedCount)} />
            <Kpi
              tone="secondary"
              icon="directory"
              label="In filter"
              value={formatNumber(mapped.totalAlumni)}
              hint={formatCount(mapped.totalAlumni, "alumnus", "alumni")}
            />
            <Kpi
              tone={mapped.skippedCount > 0 ? "alert" : "secondary"}
              icon="pin"
              label="Unplaced"
              value={formatNumber(mapped.skippedCount)}
              hint={mapped.skippedCount ? "No usable city, hometown, or US address" : "Every row in this filter mapped"}
            />
          </KpiGrid>
          {mapped.points.length === 0 ? (
            <EmptyState
              title="No mapped locations yet"
              body="Current city/state, hometown, or a US address is needed."
              icon="map"
            />
          ) : (
            <FindMyAlumMapLoader
              points={mapped.points}
              profileBase={canUseOwnerTools(viewer.role) ? "/alumni" : "/directory"}
            />
          )}
        </>
      ) : null}
    </>
  );
}
